import { MnemonicIdentity, PrfUnavailable, type WebAuthnClient } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'

/** Passkeys made on arkade.money or any of its subdomains belong to arkade.money, so they work across them. */
export const passkeyRpId = (hostname: string = window.location.hostname): string =>
  hostname === 'arkade.money' || hostname.endsWith('.arkade.money') ? 'arkade.money' : hostname

/**
 * A wallet behind a passkey. With PRF the words are derived from the passkey and nothing secret is
 * stored; without it the same passkey's user handle is the password that encrypts random words,
 * as the existing biometrics unlock does.
 */
export type PasskeyWallet = { mnemonic: string; passkeyId: string; passkeyRpId: string } & (
  | { prf: true }
  | { prf: false; password: string }
)

export async function createPasskeyWallet(
  isMainnet: boolean,
  client?: WebAuthnClient,
  rpId: string = passkeyRpId(),
): Promise<PasskeyWallet> {
  const handle = crypto.getRandomValues(new Uint8Array(21))
  try {
    const made = await MnemonicIdentity.createPasskey({
      rp: { id: rpId, name: 'Arkade' },
      // Unique: some authenticators silently replace a passkey with the same name for the same site.
      userName: `Arkade wallet · ${hex.encode(handle).slice(0, 8)}`,
      userId: handle,
      client,
      isMainnet,
    })
    return { prf: true, mnemonic: made.mnemonic, passkeyId: hex.encode(made.credentialId), passkeyRpId: rpId }
  } catch (e) {
    if (!(e instanceof PrfUnavailable) || !e.credentialId) throw e
    return {
      prf: false,
      mnemonic: generateMnemonic(wordlist),
      password: hex.encode(handle),
      passkeyId: hex.encode(e.credentialId),
      passkeyRpId: rpId,
    }
  }
}

/** The words of a PRF passkey wallet, derived again from its passkey. */
export async function passkeyMnemonic(
  wallet: { passkeyId?: string; passkeyRpId?: string },
  isMainnet: boolean,
  client?: WebAuthnClient,
): Promise<string> {
  if (!wallet.passkeyId) throw new Error('Missing passkey id')
  const { mnemonic } = await MnemonicIdentity.fromPasskey({
    rpId: wallet.passkeyRpId ?? passkeyRpId(),
    credentialIds: [hex.decode(wallet.passkeyId)],
    client,
    isMainnet,
  })
  return mnemonic
}

/** Any passkey for this site that derives words, chosen by the user: a wallet on a device that never held it. */
export async function loginWithPasskey(
  isMainnet: boolean,
  client?: WebAuthnClient,
  rpId: string = passkeyRpId(),
): Promise<{ mnemonic: string; passkeyId: string; passkeyRpId: string }> {
  const { mnemonic, credentialId } = await MnemonicIdentity.fromPasskey({ rpId, client, isMainnet })
  return { mnemonic, passkeyId: hex.encode(credentialId), passkeyRpId: rpId }
}
