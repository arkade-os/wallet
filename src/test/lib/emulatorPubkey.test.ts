import { afterEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { getEmulatorPubkeyForNetwork, getEmulatorPubkeyOverrideForNetwork } from '../../lib/constants'

/**
 * The covenant co-signer's key is caller-supplied config, never fetched
 * (arkade-os/ts-sdk#691). Everything a covenant derives from it is unspendable
 * by the solver if it is wrong, so the parsing has to fail closed: an absent or
 * malformed value must read as "no key", which disables swaps, rather than
 * flowing through as bytes that derive an address nobody can fill.
 */
describe('getEmulatorPubkeyForNetwork', () => {
  it('narrows the pinned compressed key to 32 x-only bytes', () => {
    const key = getEmulatorPubkeyForNetwork('mutinynet')
    expect(key).toBeInstanceOf(Uint8Array)
    expect(key).toHaveLength(32)
    // the 0x03 prefix is dropped, not the last byte — a slice from the wrong
    // end still yields 32 bytes and would derive a silently different covenant
    expect(hex.encode(key!)).toBe('f823b9b2febc81f4af967e77aed2f541cbd3397c6d8f5a72e32eb7b471af889a')
  })

  it('supplies the mainnet pin, matching the SDK and the live deployment', () => {
    // pinned after the key was verified three ways: the SDK's own
    // BITCOIN_EMULATOR_PUBKEY, the live /v1/info answer, and a mainnet
    // Lightning send settled against it on 2026-08-12
    expect(hex.encode(getEmulatorPubkeyForNetwork('bitcoin')!)).toBe(
      '39c196415da47b26456a101daaa12ba9e445bfe153197f1e2b750bf40e52092e',
    )
  })

  it('supplies the regtest pin, matching the SDK and the live deployment', () => {
    // pinned in .env.regtest
    expect(hex.encode(getEmulatorPubkeyForNetwork('regtest')!)).toBe(
      '999413c46fa10ada5cbc4bcc79a1d09160c2ba3cfc812705d7a13e5e545fb2a9',
    )
  })

  it('reports no key for networks with none pinned, so swaps stay off', () => {
    expect(getEmulatorPubkeyForNetwork('signet')).toBeUndefined()
    expect(getEmulatorPubkeyForNetwork('testnet')).toBeUndefined()
  })

  describe('VITE_EMULATOR_PUBKEY override', () => {
    afterEach(() => vi.unstubAllEnvs())

    it('supplies a key for a network that has none pinned', () => {
      vi.stubEnv('VITE_EMULATOR_PUBKEY', 'ab'.repeat(32))
      expect(hex.encode(getEmulatorPubkeyForNetwork('regtest')!)).toBe('ab'.repeat(32))
    })

    it.each([
      ['wrong length', 'ab'.repeat(20)],
      ['not hex', 'zz'.repeat(32)],
      ['odd digit count', 'a'.repeat(63)],
      // the Docker entrypoint leaves this literal when a deployment sets nothing
      ['unsubstituted placeholder', '__VITE_EMULATOR_PUBKEY__'],
    ])('reads a %s value as no key rather than passing it through', (_label, value) => {
      vi.stubEnv('VITE_EMULATOR_PUBKEY', value)
      expect(getEmulatorPubkeyForNetwork('testnet')).toBeUndefined()
      // and it must not fall back to another network's pinned key either
      expect(getEmulatorPubkeyForNetwork('signet')).toBeUndefined()
    })
  })
})

/**
 * The same configured value, read for a different consumer: `@arkade-os/swap`'s
 * RFQ entrypoints take the co-signer key as 33-byte COMPRESSED hex and validate
 * that shape, where the covenant derivation above wants the x-only form. The two
 * are not interchangeable in both directions, which is the whole of this helper.
 */
describe('getEmulatorPubkeyOverrideForNetwork', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('passes a pinned compressed key through unchanged', () => {
    expect(getEmulatorPubkeyOverrideForNetwork('mutinynet')).toBe(
      '03f823b9b2febc81f4af967e77aed2f541cbd3397c6d8f5a72e32eb7b471af889a',
    )
  })

  it('reads an x-only value as NO override rather than re-adding a prefix', () => {
    // Two distinct points share an x coordinate, so 02/03 is a coin flip — and a
    // wrong co-signer derives a covenant the solver will not fill. The package
    // then falls back to its own per-network pin, which fails visibly at quote
    // time instead of silently deriving the wrong address here.
    vi.stubEnv('VITE_EMULATOR_PUBKEY', 'ab'.repeat(32))
    expect(getEmulatorPubkeyOverrideForNetwork('regtest')).toBeUndefined()
    // ...while the rendezvous helper, which compares against the card's own
    // x-only key, still reads it. That asymmetry is the documented trap: a
    // deployment wanting regtest RFQ must configure the compressed form.
    expect(getEmulatorPubkeyForNetwork('regtest')).toBeDefined()
  })

  it('supplies a compressed override for a network with no pin', () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', `02${'ab'.repeat(32)}`)
    expect(getEmulatorPubkeyOverrideForNetwork('regtest')).toBe(`02${'ab'.repeat(32)}`)
  })

  it.each([
    ['wrong prefix', `04${'ab'.repeat(32)}`],
    ['too long', `02${'ab'.repeat(33)}`],
    ['not hex', `02${'zz'.repeat(32)}`],
    ['unsubstituted placeholder', '__VITE_EMULATOR_PUBKEY__'],
  ])('reads a %s value as no override', (_label, value) => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', value)
    expect(getEmulatorPubkeyOverrideForNetwork('signet')).toBeUndefined()
  })

  it('reports none for a network with nothing configured', () => {
    expect(getEmulatorPubkeyOverrideForNetwork('signet')).toBeUndefined()
  })
})
