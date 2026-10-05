import { afterEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import type { CovenantTransfer } from '@arkade-taxi/client'
import { ClaimSpent, claimVerified, walletClaimWatch, type ClaimClient } from '../../lib/receiverClaims'
import { BOB, BOB_ADDRESS, bitcoinClaim } from './receiverClaimsFixtures'
import { INFO, KEYS, TAXI_URL } from './receiverTaxiFixtures'
import { setActiveLanguage } from '../../lib/language'
import { Language } from '../../lib/types'

const taxi = { network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator }
const aspInfo = {
  url: 'https://arkd.wallet.example',
  network: 'regtest',
  signerPubkey: KEYS.server,
  dust: 330n,
  vtxoMinAmount: 1n,
  vtxoTreeExpiry: 604_800n,
  checkpointTapscript: 'cafe',
}
const production = () =>
  walletClaimWatch({ aspInfo, taxis: [taxi], receiverAddress: BOB_ADDRESS, onOffer: vi.fn(), onGone: vi.fn() })

describe('wallet Taxi claim adapter', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('trusts the configured wallet server and co-signer, never the claim feed', () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
    expect(production().trust).toEqual({
      serverKey: hex.decode(KEYS.server),
      emulatorKey: hex.decode(KEYS.emulator),
      vtxoMinAmount: 1n,
      hrp: 'tark',
    })
  })

  it('submits through the wallet arkd and takes only the emulator URL from the Taxi', async () => {
    const client = { info: async () => INFO } as unknown as ClaimClient
    expect(await production().spendConfig(client)).toEqual({
      arkdUrl: aspInfo.url,
      emulatorUrl: INFO.emulatorUrl,
      network: 'regtest',
      serverUnrollScript: 'cafe',
    })
  })

  it('localizes a consumed claim failure while preserving its one-shot identity and cause', async () => {
    setActiveLanguage(Language.English)
    const reason = { code: 'operator_inventory_insufficient', message: 'provider inventory unavailable' }
    const client = {
      purchase: async () => {
        throw reason
      },
    } as unknown as ClaimClient
    const offer = { taxi, claim: bitcoinClaim(320n, 'purchase'), transfer: {} as CovenantTransfer, client }
    const error = await claimVerified(offer, { kind: 'purchase', receivedSats: 330n }, BOB).catch(
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(ClaimSpent)
    expect((error as ClaimSpent).reason).toBe(reason)
    expect((error as Error).message).toBe(
      "Taxi can't fund this payment from its available coins while keeping its reserve. Your wallet balance is not the issue.",
    )
  })
})
