import { hex } from '@scure/base'
import { randomBytes } from '@noble/hashes/utils.js'

// Fixed PRF evaluation input: the same passkey must always produce the same
// 32-byte secret, so this value is part of the vault format and must never change.
export const PRF_EVAL_INPUT = new TextEncoder().encode('arkade-wallet/prf/v1')

// PRF extension types are not yet in TypeScript's lib.dom
type PrfExtensionInputs = { prf: { eval: { first: BufferSource } } }
type PrfExtensionOutputs = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } }

export type PasskeyRegistration =
  | { kind: 'prf'; credentialId: string; prfOutput: Uint8Array }
  // authenticator has no PRF support: reuse the created credential with the
  // legacy scheme (random secret stored as the WebAuthn userHandle)
  | { kind: 'legacy'; credentialId: string; legacySecret: string }

export class PrfUnavailableError extends Error {
  constructor() {
    super('This passkey cannot derive the wallet encryption key (PRF unavailable)')
    this.name = 'PrfUnavailableError'
  }
}

export function isWebAuthnSupported(): boolean {
  return 'credentials' in navigator && typeof window.PublicKeyCredential === 'function'
}

// e.g. "Arkade wallet · 2026-07-09 · a3f9c1" — date to spot old ones in the
// picker, random tag to guarantee same-day uniqueness
function passkeyLabel(userId: Uint8Array): string {
  return `Arkade wallet · ${new Date().toISOString().slice(0, 10)} · ${hex.encode(userId.slice(0, 3))}`
}

/**
 * Best-effort: tells the browser a credential is no longer usable so it can
 * hide/remove it from its passkey manager and pickers (WebAuthn signal API,
 * Chromium-only for now). Use ONLY for credentials whose wallet is provably
 * empty/retired — a signalled passkey may be deleted by the platform.
 */
export async function signalPasskeyRetired(credentialIdHex: string): Promise<void> {
  const cred = PublicKeyCredential as unknown as {
    signalUnknownCredential?: (args: { rpId: string; credentialId: string }) => Promise<void>
  }
  if (typeof cred?.signalUnknownCredential !== 'function') return
  try {
    const bytes = hex.decode(credentialIdHex)
    const base64url = btoa(String.fromCharCode(...bytes))
      .replaceAll('=', '')
      .replaceAll('+', '-')
      .replaceAll('/', '_')
    await cred.signalUnknownCredential({ rpId: window.location.hostname, credentialId: base64url })
  } catch {
    // cleanup is cosmetic — never fail the caller
  }
}

// webauthn returns the challenge base64url-encoded without padding,
// so apply the same transformations before comparing
function arrayToBase64(data: Uint8Array | ArrayBuffer): string {
  const array = data instanceof ArrayBuffer ? new Uint8Array(data) : data
  return btoa(String.fromCharCode(...array))
    .replaceAll('=', '')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
}

function validateClientData(
  response: AuthenticatorResponse,
  type: 'webauthn.create' | 'webauthn.get',
  challenge: Uint8Array,
) {
  const clientDataJSON = JSON.parse(new TextDecoder().decode(response.clientDataJSON))
  if (clientDataJSON.type !== type) throw new Error('Invalid clientDataJSON type')
  if (clientDataJSON.challenge !== arrayToBase64(challenge)) throw new Error('Invalid challenge')
  if (clientDataJSON.origin !== window.location.origin) throw new Error('Invalid origin')
}

/**
 * Registers a platform passkey requesting the PRF extension.
 * If the authenticator supports PRF, returns the 32-byte PRF output (evaluated
 * at create() when the authenticator allows it, otherwise via an immediate
 * assertion — a second biometric prompt). If PRF is unsupported, the same
 * credential is returned for use with the legacy userHandle scheme, so no
 * orphan credential is ever created.
 */
export async function registerPasskey(): Promise<PasskeyRegistration> {
  const challenge = randomBytes(32)
  const userId = randomBytes(21)

  const options: PublicKeyCredentialCreationOptions = {
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      requireResidentKey: true,
    },
    challenge: challenge as BufferSource,
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    rp: {
      name: 'Arkade',
      id: window.location.hostname,
    },
    timeout: 60000,
    user: {
      id: userId as BufferSource,
      // MUST be unique per wallet: platform authenticators (notably iCloud
      // Keychain) silently REPLACE an existing passkey for the same rp.id +
      // user.name — which would destroy the PRF secret an existing wallet is
      // derived from. A unique name makes a second wallet a second passkey,
      // and the creation date makes older ones recognizable in the picker.
      name: passkeyLabel(userId),
      displayName: passkeyLabel(userId),
    },
    extensions: { prf: { eval: { first: PRF_EVAL_INPUT as BufferSource } } } as PrfExtensionInputs,
  }

  const credentials = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential
  validateClientData(credentials.response, 'webauthn.create', challenge)

  const credentialId = hex.encode(new Uint8Array(credentials.rawId))
  const prf = (credentials.getClientExtensionResults() as PrfExtensionOutputs).prf

  if (!prf?.enabled) return { kind: 'legacy', credentialId, legacySecret: hex.encode(userId) }

  // PRF is only guaranteed at get(), and some authenticators return a value at
  // create() that does NOT match get() (which then fails to decrypt the vault
  // with an opaque OperationError). Always derive the vault key from a get()
  // assertion so unlock — also a get() — reproduces the exact same key. If get()
  // can't produce PRF, fall back to the legacy scheme on this same credential
  // rather than minting a vault that can never be opened.
  try {
    const prfOutput = await assertPrf(credentialId)
    return { kind: 'prf', credentialId, prfOutput }
  } catch (err) {
    if (err instanceof PrfUnavailableError) {
      return { kind: 'legacy', credentialId, legacySecret: hex.encode(userId) }
    }
    throw err
  }
}

/**
 * Runs a WebAuthn assertion evaluating the PRF extension over the fixed input.
 * Returns the 32-byte PRF output used to derive the vault encryption key.
 */
export async function assertPrf(credentialIdHex: string): Promise<Uint8Array> {
  const challenge = randomBytes(32)

  const options: PublicKeyCredentialRequestOptions = {
    allowCredentials: [{ id: hex.decode(credentialIdHex) as BufferSource, type: 'public-key' }],
    challenge: challenge as BufferSource,
    rpId: window.location.hostname,
    timeout: 60000,
    extensions: { prf: { eval: { first: PRF_EVAL_INPUT as BufferSource } } } as PrfExtensionInputs,
  }

  const credentials = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential
  validateClientData(credentials.response, 'webauthn.get', challenge)

  const prf = (credentials.getClientExtensionResults() as PrfExtensionOutputs).prf
  if (!prf?.results?.first) throw new PrfUnavailableError()

  return new Uint8Array(prf.results.first)
}

/**
 * "Log in with passkey": a discoverable-credential assertion (no credential id
 * given — the browser shows the account picker of this site's passkeys). The
 * chosen passkey's PRF output deterministically reconstructs the wallet, so
 * this works even on a fresh browser with empty storage.
 */
export async function assertPrfDiscoverable(): Promise<{ credentialId: string; prfOutput: Uint8Array }> {
  const challenge = randomBytes(32)

  const options: PublicKeyCredentialRequestOptions = {
    challenge: challenge as BufferSource,
    rpId: window.location.hostname,
    timeout: 60000,
    extensions: { prf: { eval: { first: PRF_EVAL_INPUT as BufferSource } } } as PrfExtensionInputs,
  }

  const credentials = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential
  validateClientData(credentials.response, 'webauthn.get', challenge)

  const prf = (credentials.getClientExtensionResults() as PrfExtensionOutputs).prf
  if (!prf?.results?.first) throw new PrfUnavailableError()

  return { credentialId: hex.encode(new Uint8Array(credentials.rawId)), prfOutput: new Uint8Array(prf.results.first) }
}
