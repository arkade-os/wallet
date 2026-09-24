import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hex } from '@scure/base'
import { SwapRefusal, type AssetSwap, type RfqTransport } from '@arkade-os/swap'
import type { IWallet } from '@arkade-os/sdk'
import type { AssetPaymentTerms, AssetRfqSendDeps, PayRailUi } from '../../lib/assetRfqSend'
import {
  ASSET_ID,
  COVENANT_ADDRESS,
  INFO,
  KEYS,
  RECEIVER_ADDRESS,
  TAXI,
  arkadeContext,
  taxiFetch,
  unreachable,
} from './receiverTaxiFixtures'
import { btcUsdt, USDT_ID } from './swapFixtures'

const nostrRfqTransport = vi.hoisted(() => vi.fn())
vi.mock('@arkade-os/swap/nostr', () => ({ nostrRfqTransport }))
const consoleError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/logs', () => ({ consoleError, consoleLog: vi.fn() }))

const { assetRfqSolvers, payAssetRequest, PaymentDeclined } = await import('../../lib/assetRfqSend')

const SOLVER_A = { solverPubkey: 'aa'.repeat(32), transports: { nostr: { relays: ['wss://a.test'] } } }
const SOLVER_B = { solverPubkey: 'bb'.repeat(32), transports: { nostr: { relays: ['wss://b.test'] } } }
const REQUEST = { arkAddress: RECEIVER_ADDRESS, assetId: ASSET_ID, amount: 500n, taxi: TAXI }
const TAXI_PRICE = 10_000n
const PURCHASE_PRICE = 10_400n

type Negotiated = Awaited<ReturnType<AssetRfqSendDeps['requestArkadeSwap']>>
const negotiated = (fundAmount: bigint): Negotiated =>
  ({ rfqId: 'rfq-1', quote: { valid_until: 2_000_000_000 }, fundAmount, offerHex: 'ab' }) as unknown as Negotiated
const refusal = (reason: string) => new SwapRefusal(reason, 'rfq-1')

/** Implements every method the rail can reach the user through, and records each call. */
const recorder = (answer = true) => {
  const calls: [keyof PayRailUi, AssetPaymentTerms][] = []
  const ui: PayRailUi = {
    confirmPayment: async (terms) => {
      calls.push(['confirmPayment', terms])
      return answer
    },
  }
  return { ui, calls }
}

let prompts: ReturnType<typeof recorder>
const deps = (over: Partial<AssetRfqSendDeps> = {}): AssetRfqSendDeps => {
  const { serverKey, emulatorKey, hrp, dust, vtxoMinAmount, locktimeDomain } = arkadeContext()
  return {
    wallet: { identity: { xOnlyPublicKey: async () => hex.decode(KEYS.maker) } } as unknown as IWallet,
    arkServerUrl: 'https://ark.test',
    arkade: { serverKey, emulatorKey, hrp, dust, vtxoMinAmount, locktimeDomain },
    solvers: [SOLVER_A, SOLVER_B],
    ui: prompts.ui,
    fetch: taxiFetch(),
    pageProtocol: 'https:',
    repository: {} as AssetRfqSendDeps['repository'],
    requestArkadeSwap: vi.fn(async (_w, _u, _t, params) =>
      negotiated(params.carrier?.mode === 'recycleReceiver' ? TAXI_PRICE : PURCHASE_PRICE),
    ),
    fundOffer: vi.fn(async () => ({ id: 'swap-1', fundingTxid: 'f'.repeat(64) }) as unknown as AssetSwap),
    ...over,
  }
}

const carriersOf = (d: AssetRfqSendDeps) =>
  vi.mocked(d.requestArkadeSwap).mock.calls.map(([, , , params]) => params.carrier)
const solversOf = () => nostrRfqTransport.mock.calls.map(([options]) => options.solverPubkey)
const onlyTheConfirmation = (payAmountSats: bigint) =>
  expect(prompts.calls).toEqual([['confirmPayment', { payAmountSats, assetId: ASSET_ID, assetAmount: 500n }]])

beforeEach(() => {
  prompts = recorder()
  consoleError.mockReset()
  nostrRfqTransport.mockReset().mockReturnValue({} as RfqTransport)
})

describe('payAssetRequest', () => {
  it('pays with a receiver-paid carrier when the probe passes', async () => {
    const d = deps()
    await payAssetRequest(REQUEST, d)
    expect(d.requestArkadeSwap).toHaveBeenCalledWith(
      d.wallet,
      d.arkServerUrl,
      expect.anything(),
      expect.objectContaining({
        amount: 500n,
        amountSide: 'to',
        carrier: expect.objectContaining({
          mode: 'recycleReceiver',
          quote: expect.objectContaining({ receiveAddress: COVENANT_ADDRESS, physicalSats: 330n, loanSats: 330n }),
          taxi: { url: TAXI.url, operatorKey: TAXI.operatorKey },
        }),
      }),
    )
    const [, , , params] = vi.mocked(d.requestArkadeSwap).mock.calls[0]
    expect(params.wantAsset?.toString()).toBe(ASSET_ID)
    expect(params).not.toHaveProperty('receiveAddress')
    expect(d.fundOffer).toHaveBeenCalledWith(d.wallet, d.arkServerUrl, {
      repository: d.repository,
      id: 'rfq-1',
      offerHex: 'ab',
      deposit: { amount: TAXI_PRICE },
      validUntil: 2_000_000_000,
      inputExpiryFloor: { kind: 'time', value: 4_000_000_000n },
    })
    onlyTheConfirmation(TAXI_PRICE)
  })

  it('falls back to a plain purchase when the Taxi is unreachable, asking nothing', async () => {
    const d = deps({ fetch: unreachable() })
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    const [, , , params] = vi.mocked(d.requestArkadeSwap).mock.calls[0]
    expect(params.receiveAddress).toBe(RECEIVER_ADDRESS)
    expect(d.fundOffer).toHaveBeenCalledWith(
      d.wallet,
      d.arkServerUrl,
      expect.not.objectContaining({ inputExpiryFloor: expect.anything() }),
    )
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it.each([
    ['paused', { ...INFO, paused: true }],
    ['operator-key-mismatch', { ...INFO, operatorKey: KEYS.other }],
  ])('falls back when the probe refuses (%s), asking nothing', async (reason, info) => {
    const d = deps({ fetch: taxiFetch({ info }) })
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(reason))
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('falls back when the Taxi refuses the receive quote, asking nothing', async () => {
    const d = deps({ fetch: taxiFetch({ quote: { code: 'BAD_REQUEST', message: 'no' }, quoteStatus: 400 }) })
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('falls back when the solver refuses the mode, on the same solver first', async () => {
    const d = deps()
    vi.mocked(d.requestArkadeSwap).mockRejectedValueOnce(refusal('unsupported_payload'))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'purchase'])
    expect(solversOf()).toEqual([SOLVER_A.solverPubkey, SOLVER_A.solverPubkey])
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('unsupported_payload'))
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('moves to the next solver with a purchase, not the dropped Taxi', async () => {
    const d = deps()
    vi.mocked(d.requestArkadeSwap)
      .mockRejectedValueOnce(refusal('price_unavailable'))
      .mockRejectedValueOnce(refusal('exposure_cap'))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'purchase', 'purchase'])
    expect(solversOf()).toEqual([SOLVER_A.solverPubkey, SOLVER_A.solverPubkey, SOLVER_B.solverPubkey])
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('logs the reason it dropped the Taxi', async () => {
    await payAssetRequest(REQUEST, deps({ fetch: unreachable() }))
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('unreachable'))
  })

  it('never retries a failed funding as a purchase', async () => {
    const lost = new Error('send outcome unknown')
    const d = deps({ fundOffer: vi.fn().mockRejectedValue(lost) })
    await expect(payAssetRequest(REQUEST, d)).rejects.toBe(lost)
    expect(d.requestArkadeSwap).toHaveBeenCalledTimes(1)
    expect(d.fundOffer).toHaveBeenCalledTimes(1)
  })

  it('funds nothing the user declines, and retries nothing', async () => {
    prompts = recorder(false)
    const d = deps()
    await expect(payAssetRequest(REQUEST, d)).rejects.toBeInstanceOf(PaymentDeclined)
    expect(d.requestArkadeSwap).toHaveBeenCalledTimes(1)
    expect(d.fundOffer).not.toHaveBeenCalled()
  })

  it('surfaces the last refusal when no solver will quote, funding nothing', async () => {
    const d = deps({ requestArkadeSwap: vi.fn().mockRejectedValue(refusal('pair_unsupported')) })
    await expect(payAssetRequest(REQUEST, d)).rejects.toThrow(/pair_unsupported/)
    expect(d.fundOffer).not.toHaveBeenCalled()
    expect(prompts.calls).toEqual([])
  })

  it('probes no Taxi when the request names none', async () => {
    const d = deps()
    await payAssetRequest({ ...REQUEST, taxi: undefined }, d)
    expect(d.fetch).not.toHaveBeenCalled()
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
  })
})

describe('assetRfqSolvers', () => {
  const nostr = (pubkey: string) => ({ discovery_pubkey: pubkey, transports: { nostr: { relays: ['wss://r.test'] } } })

  it('lists each solver selling the asset for BTC over nostr, once', () => {
    const markets = [
      { ...btcUsdt, ...nostr('aa'.repeat(32)) },
      { ...btcUsdt, ...nostr('aa'.repeat(32)), pair: 'BTC/USDT-2' },
      { ...btcUsdt, ...nostr('bb'.repeat(32)), max_quote_amount: '0' },
      { ...btcUsdt, discovery_pubkey: 'cc'.repeat(32) },
      { ...btcUsdt, ...nostr('dd'.repeat(32)), quote_asset: { ...btcUsdt.quote_asset, id: 'ee'.repeat(34) } },
      { ...btcUsdt, ...nostr('ff'.repeat(32)) },
    ]
    expect(assetRfqSolvers(markets, USDT_ID)).toEqual([
      { solverPubkey: 'aa'.repeat(32), transports: { nostr: { relays: ['wss://r.test'] } } },
      { solverPubkey: 'ff'.repeat(32), transports: { nostr: { relays: ['wss://r.test'] } } },
    ])
  })
})
