import { afterEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import type { ExtendedVirtualCoin, IWallet } from '@arkade-os/sdk'
import type { AssetSwap } from '@arkade-os/swap'
import { walletAssetRfqDeps } from '../../lib/assetRfqSend'
import { assetSwapRepository } from '../../lib/swapRepository'
import { btcUsdt, USDT_ID } from './swapFixtures'
import { KEYS } from './receiverTaxiFixtures'

const market = {
  ...btcUsdt,
  discovery_pubkey: 'aa'.repeat(32),
  transports: { nostr: { relays: ['wss://solver.example'] } },
}
const aspInfo = {
  url: 'https://arkd.wallet.example',
  network: 'regtest',
  signerPubkey: KEYS.server,
  dust: 330n,
  vtxoMinAmount: 1n,
  vtxoTreeExpiry: 604_800n,
}
const coin = (vout: number) => ({ txid: 'cc'.repeat(32), vout, value: 1000 }) as ExtendedVirtualCoin
const coins = [coin(0), coin(1), coin(2)]
const wallet = { getSpendableVtxos: async () => coins } as unknown as IWallet
const production = () =>
  walletAssetRfqDeps({
    aspInfo,
    wallet,
    markets: [market],
    assetId: USDT_ID,
    ui: { confirmPayment: async () => false },
  })

describe('wallet Taxi RFQ adapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('uses the wallet server, trusted key configuration, repository, and available solver rendezvous', () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', `02${KEYS.emulator}`)
    const deps = production()
    expect(deps.arkServerUrl).toBe(aspInfo.url)
    expect(hex.encode(deps.arkade.serverKey)).toBe(KEYS.server)
    expect(hex.encode(deps.arkade.emulatorKey)).toBe(KEYS.emulator)
    expect(deps.emulatorPubkey).toBe(`02${KEYS.emulator}`)
    expect(deps.repository).toBe(assetSwapRepository)
    expect(deps.solvers).toEqual([{ solverPubkey: market.discovery_pubkey, transports: market.transports }])
  })

  it('excludes prepared and submitted funding reservations from Taxi negotiation', async () => {
    vi.spyOn(assetSwapRepository, 'getAllSwaps').mockResolvedValue([
      { fundingIntent: { state: 'prepared', inputs: [coin(0)] } },
      { fundingIntent: { state: 'submitted', inputs: [coin(1)] } },
      { fundingIntent: { state: 'confirmed', inputs: [coin(2)] } },
    ] as unknown as AssetSwap[])
    expect(await production().unreservedCoins(wallet)).toEqual([coin(2)])
  })
})
