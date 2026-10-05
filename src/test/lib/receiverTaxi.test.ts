import { afterEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { arkadeContextOf } from '../../lib/receiverTaxi'
import { KEYS } from './receiverTaxiFixtures'

const info = {
  network: 'regtest',
  signerPubkey: `02${KEYS.server}`,
  dust: 330n,
  vtxoMinAmount: 1n,
  vtxoTreeExpiry: 20n,
}

describe('wallet Taxi trusted context adapter', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses the configured wallet co-signer and its own server, including compressed keys', async () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', `03${KEYS.emulator}`)
    const context = arkadeContextOf(info, async () => 812)
    expect(hex.encode(context.serverKey)).toBe(KEYS.server)
    expect(hex.encode(context.emulatorKey)).toBe(KEYS.emulator)
    expect(context).toMatchObject({ hrp: 'tark', dust: 330n, vtxoMinAmount: 1n, locktimeDomain: 'height' })
    expect(await context.clock()).toBe(812n)
  })

  it('fails closed when the wallet has no valid co-signer pin', () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', 'not-a-key')
    expect(arkadeContextOf(info, async () => 812).emulatorKey).toHaveLength(0)
  })
})
