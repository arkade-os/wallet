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

  it('reports no key for networks with none pinned, so swaps stay off', () => {
    // mainnet deliberately has no key: guessing one would derive a covenant the
    // solver can never fill, with real funds in it
    expect(getEmulatorPubkeyForNetwork('bitcoin')).toBeUndefined()
    expect(getEmulatorPubkeyForNetwork('signet')).toBeUndefined()
    expect(getEmulatorPubkeyForNetwork('testnet')).toBeUndefined()
    // regtest keys are per-deployment; a dev supplies one via VITE_EMULATOR_PUBKEY
    expect(getEmulatorPubkeyForNetwork('regtest')).toBeUndefined()
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
      expect(getEmulatorPubkeyForNetwork('regtest')).toBeUndefined()
      // and it must not fall back to another network's pinned key either
      expect(getEmulatorPubkeyForNetwork('bitcoin')).toBeUndefined()
    })
  })
})
