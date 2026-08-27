import { afterEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { getEmulatorPubkeyForNetwork } from '../../lib/constants'

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
