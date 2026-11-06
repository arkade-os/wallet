import { createHmac } from 'node:crypto'
import { hex } from '@scure/base'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { MnemonicIdentity, PrfUnavailable, type WebAuthnClient } from '@arkade-os/sdk'
import { describe, expect, it } from 'vitest'
import { createPasskeyWallet, loginWithPasskey, passkeyMnemonic, passkeyRpId } from '../../lib/passkey'

type Held = { id: Uint8Array; secret: Uint8Array; userHandle: Uint8Array; rpId: string; userName: string }

const bytes = (b: BufferSource) =>
  new Uint8Array(b instanceof ArrayBuffer ? b : b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
const saltOf = (e: unknown) => (e as { prf?: { eval?: { first: BufferSource } } } | undefined)?.prf?.eval?.first

/** In-memory authenticator; its PRF is HMAC-SHA256 under a per-credential secret, as CTAP hmac-secret is. */
class FakeAuthenticator implements WebAuthnClient {
  readonly held: Held[] = []
  constructor(private readonly prf = true) {}

  async create(o: CredentialCreationOptions): Promise<Credential | null> {
    const pk = o.publicKey!
    const h: Held = {
      id: crypto.getRandomValues(new Uint8Array(16)),
      secret: crypto.getRandomValues(new Uint8Array(32)),
      userHandle: bytes(pk.user.id),
      rpId: pk.rp.id!,
      userName: pk.user.name,
    }
    this.held.push(h)
    return this.credential(h, this.prf ? { enabled: true } : { enabled: false })
  }

  async get(o: CredentialRequestOptions): Promise<Credential | null> {
    const pk = o.publicKey!
    const allowed = pk.allowCredentials?.map((c) => hex.encode(bytes(c.id)))
    const h = [...this.held]
      .reverse()
      .find((x) => x.rpId === pk.rpId && (!allowed?.length || allowed.includes(hex.encode(x.id))))
    if (!h) throw new DOMException('no such passkey', 'NotAllowedError')
    const salt = saltOf(pk.extensions)
    const first = this.prf && salt ? new Uint8Array(createHmac('sha256', h.secret).update(bytes(salt)).digest()) : null
    return this.credential(h, first ? { first } : {})
  }

  private credential(h: Held, prf: { enabled?: boolean; first?: Uint8Array }): Credential {
    return {
      rawId: h.id.slice().buffer,
      response: { userHandle: h.userHandle.slice().buffer },
      getClientExtensionResults: () => ({
        prf: {
          ...(prf.enabled === undefined ? {} : { enabled: prf.enabled }),
          ...(prf.first ? { results: { first: prf.first.slice().buffer } } : {}),
        },
      }),
    } as unknown as Credential
  }
}

describe('passkey wallets', () => {
  it('ties passkeys to arkade.money on arkade.money and its subdomains, and to the page host elsewhere', () => {
    expect(passkeyRpId('arkade.money')).toBe('arkade.money')
    expect(passkeyRpId('next.arkade.money')).toBe('arkade.money')
    expect(passkeyRpId('localhost')).toBe('localhost')
    expect(passkeyRpId('notarkade.money')).toBe('notarkade.money')
  })

  it('derives the words from the passkey and keeps no secret, then derives them again to unlock', async () => {
    const client = new FakeAuthenticator()
    const made = await createPasskeyWallet(false, client, 'localhost')
    expect(made.prf).toBe(true)
    expect(validateMnemonic(made.mnemonic, wordlist)).toBe(true)
    expect(made).not.toHaveProperty('password')
    expect(made.passkeyId).toBe(hex.encode(client.held[0].id))
    expect(made.passkeyRpId).toBe('localhost')
    expect(await passkeyMnemonic(made, false, client)).toBe(made.mnemonic)
  })

  it('derives the same words as the SDK, so the wallet is the one any Breez-compatible app finds', async () => {
    const client = new FakeAuthenticator()
    const made = await createPasskeyWallet(false, client, 'localhost')
    const sdk = await MnemonicIdentity.fromPasskey({
      rpId: 'localhost',
      credentialIds: [client.held[0].id],
      client,
      isMainnet: false,
    })
    expect(sdk.mnemonic).toBe(made.mnemonic)
  })

  it('falls back to the same passkey as a user-handle unlock key when the authenticator has no PRF', async () => {
    const client = new FakeAuthenticator(false)
    const made = await createPasskeyWallet(false, client, 'localhost')
    expect(made.prf).toBe(false)
    expect(client.held).toHaveLength(1)
    expect(made.passkeyId).toBe(hex.encode(client.held[0].id))
    if (made.prf) throw new Error('expected the fallback')
    expect(made.password).toBe(hex.encode(client.held[0].userHandle))
    expect(validateMnemonic(made.mnemonic, wordlist)).toBe(true)
  })

  it('gives each passkey its own user name, since some authenticators replace a passkey with the same one', async () => {
    const client = new FakeAuthenticator()
    const made = await createPasskeyWallet(false, client, 'localhost')
    await createPasskeyWallet(false, client, 'localhost')
    expect(client.held[0].userName).not.toBe(client.held[1].userName)
    expect(made.passkeyName).toBe(client.held[0].userName)
  })

  it('signs in on a new device from the passkey alone, and refuses a passkey that only unlocks local words', async () => {
    const client = new FakeAuthenticator()
    const made = await createPasskeyWallet(false, client, 'localhost')
    const found = await loginWithPasskey(false, client, 'localhost')
    expect(found).toEqual({ mnemonic: made.mnemonic, passkeyId: made.passkeyId, passkeyRpId: 'localhost' })
    const legacy = new FakeAuthenticator(false)
    await createPasskeyWallet(false, legacy, 'localhost')
    await expect(loginWithPasskey(false, legacy, 'localhost')).rejects.toThrow(PrfUnavailable)
  })
})
