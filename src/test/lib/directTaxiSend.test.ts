import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SingleKey } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { sendDirectTaxi } from '../../lib/directTaxiSend'
import { assetSwapRepository } from '../../lib/swapRepository'
import {
  ASSET_ID,
  BITCOIN_INFO,
  KEYS,
  RECEIVER_ADDRESS,
  legacyBitcoinQuote,
  TAXI_URL,
  senderCoin,
  taxiFetch,
} from './receiverTaxiFixtures'

// jsdom has no IndexedDB, and a send reads the funding reservations from this repository.
vi.mock('../../lib/swapRepository', async (importOriginal) => {
  const { InMemoryAssetSwapRepository } = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return {
    ...(await importOriginal<typeof import('../../lib/swapRepository')>()),
    assetSwapRepository: new InMemoryAssetSwapRepository(),
  }
})
const wallet = { identity: SingleKey.fromRandomBytes() }
const request = vi.fn((_key: string, run: () => Promise<unknown>) => run())
beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('sending sub-dust bitcoin through the Taxi', () => {
  const send = (over: Record<string, unknown>) =>
    sendDirectTaxi({
      aspInfo: {
        network: 'regtest',
        signerPubkey: KEYS.server,
        dust: 330n,
        vtxoMinAmount: 1n,
        checkpointTapscript: '51',
      },
      taxi: { url: TAXI_URL },
      receiverAddress: RECEIVER_ADDRESS,
      amount: 100n,
      mode: 'recycle',
      confirmPayment: async () => true,
      ...over,
    } as never)
  const posts = (fetch: ReturnType<typeof taxiFetch>) => fetch.mock.calls.filter(([, init]) => init?.method === 'POST')
  const journalKeys = () => Object.keys(localStorage).filter((name) => name.startsWith('directTaxiPending'))

  beforeEach(() => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
    request.mockClear()
    vi.stubGlobal('navigator', { locks: { request } })
  })

  it('formats SDK refusal reasons for the sender without requesting a quote', async () => {
    const fetch = taxiFetch()
    vi.stubGlobal('fetch', fetch)
    await expect(send({ wallet })).rejects.toThrow("Taxi unavailable: it doesn't carry sub-dust bitcoin")
    expect(posts(fetch)).toEqual([])
    expect(journalKeys()).toEqual([])
  })

  it('asks a Taxi for exactly the amount typed, and moves nothing when the quote ignores it', async () => {
    const senderKey = hex.encode(await wallet.identity.xOnlyPublicKey())
    const fetch = taxiFetch({ info: BITCOIN_INFO, transfer: legacyBitcoinQuote(senderKey) })
    vi.stubGlobal('fetch', fetch)
    const coin = await senderCoin(wallet.identity, 1_000)
    const confirmPayment = vi.fn()
    await expect(
      send({ wallet: { identity: wallet.identity, getSpendableVtxos: async () => [coin] }, confirmPayment }),
    ).rejects.toThrow("This Taxi can't carry an exact sub-dust amount")
    const [[url, init]] = posts(fetch)
    expect(url).toBe(`${TAXI_URL}/v1/transfers`)
    const body = JSON.parse(String(init!.body))
    expect(body).toMatchObject({ paymentSats: '100', senderSats: '1000', claimMode: 'recycle', fareId: 'sats' })
    expect(body).not.toHaveProperty('assetId')
    expect(body).not.toHaveProperty('assetUnits')
    expect(posts(fetch)).toHaveLength(1)
    expect(confirmPayment).not.toHaveBeenCalled()
    expect(journalKeys()).toEqual([])
  })

  it('rejects before quoting when a prepared swap reserves the only spendable sats coin', async () => {
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    vi.stubGlobal('fetch', fetch)
    const reserved = await senderCoin(wallet.identity, 1_000)
    const assetCoin = {
      ...(await senderCoin(wallet.identity, 330)),
      txid: 'd'.repeat(64),
      vout: 1,
      value: 330,
      assets: [{ assetId: ASSET_ID, amount: 5n }],
    }
    vi.spyOn(assetSwapRepository, 'getAllSwaps').mockResolvedValue([
      { fundingIntent: { state: 'prepared', inputs: [{ txid: reserved.txid, vout: reserved.vout }] } },
    ] as never)
    const confirmPayment = vi.fn(async () => true)
    const coins = async () => [reserved, assetCoin]

    await expect(
      send({ wallet: { identity: wallet.identity, getSpendableVtxos: coins }, confirmPayment }),
    ).rejects.toThrow('This Taxi payment needs 330 sats left for spendable asset change')
    expect(posts(fetch)).toEqual([])
    expect(confirmPayment).not.toHaveBeenCalled()
    expect(journalKeys()).toEqual([])
  })
})
