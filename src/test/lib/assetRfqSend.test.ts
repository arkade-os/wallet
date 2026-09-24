import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import { SwapRefusal, type AssetSwap, type RfqTransport } from '@arkade-os/swap'
import type { IWallet } from '@arkade-os/sdk'
import type { AssetPaymentTerms, AssetRfqSendDeps, PayRailUi } from '../../lib/assetRfqSend'
import {
  ASSET_ID,
  COVENANT_ADDRESS,
  DEFAULT_FLOOR,
  EARLY_FLOOR,
  EARLY_QUOTE,
  INFO,
  KEYS,
  RECEIVER_ADDRESS,
  TAXI,
  TWO_FARES,
  arkadeContext,
  coin,
  taxiFetch,
  unreachable,
} from './receiverTaxiFixtures'
import { btcUsdt, USDT_ID } from './swapFixtures'

const nostrRfqTransport = vi.hoisted(() => vi.fn())
vi.mock('@arkade-os/swap/nostr', () => ({ nostrRfqTransport }))
const consoleError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/logs', () => ({ consoleError, consoleLog: vi.fn() }))

const {
  assetRfqSolvers,
  FILL_MARGIN_SECONDS,
  hasSatsForReceiverTaxi,
  payAssetRequest,
  PaymentDeclined,
  routesToReceiverTaxi,
} = await import('../../lib/assetRfqSend')

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
/** Alice's spendable coins, and the funding reservations other swaps hold on them. */
const walletWith = (coins: ReturnType<typeof coin>[], reserved: { txid: string; vout: number }[] = []) => ({
  wallet: {
    identity: { xOnlyPublicKey: async () => hex.decode(KEYS.maker) },
    getSpendableVtxos: async () => coins,
  } as unknown as IWallet,
  repository: {
    getAllSwaps: async () => [{ fundingIntent: { state: 'prepared', inputs: reserved } }],
  } as unknown as AssetRfqSendDeps['repository'],
})

const deps = (over: Partial<AssetRfqSendDeps> = {}): AssetRfqSendDeps => {
  const { serverKey, emulatorKey, hrp, dust, vtxoMinAmount, locktimeDomain, clock } = arkadeContext()
  return {
    ...walletWith([coin(50_000, 4_500_000_000n)]),
    arkServerUrl: 'https://ark.test',
    arkade: { serverKey, emulatorKey, hrp, dust, vtxoMinAmount, locktimeDomain, clock },
    solvers: [SOLVER_A, SOLVER_B],
    ui: prompts.ui,
    fetch: taxiFetch(),
    pageProtocol: 'https:',
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
      inputExpiryFloor: { kind: 'time', value: DEFAULT_FLOOR },
    })
    onlyTheConfirmation(TAXI_PRICE)
  })

  it('falls back to a plain purchase when the Taxi is unreachable, with only the price confirmation', async () => {
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
  ])('falls back when the probe refuses (%s), with only the price confirmation', async (reason, info) => {
    const d = deps({ fetch: taxiFetch({ info }) })
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining(reason))
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('falls back when the Taxi refuses the receive quote, with only the price confirmation', async () => {
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

  it("asks for a floor her own coins clear when they are older than the Taxi's, and funds against it", async () => {
    const own = coin(20_000, EARLY_FLOOR)
    const reservedElsewhere = coin(90_000, 2_500_000_000n, 1)
    const d = deps(walletWith([own, reservedElsewhere], [reservedElsewhere]))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d)[0]).toMatchObject({ quote: { receiveAddress: EARLY_QUOTE.covenantAddress } })
    expect(d.fundOffer).toHaveBeenCalledWith(
      d.wallet,
      d.arkServerUrl,
      expect.objectContaining({ inputExpiryFloor: { kind: 'time', value: EARLY_FLOOR } }),
    )
    onlyTheConfirmation(TAXI_PRICE)
  })

  it('buys a carrier before asking, when the coins clearing the floor fall short', async () => {
    const d = deps(walletWith([coin(6_000, EARLY_FLOOR), coin(3_000, DEFAULT_FLOOR, 1), coin(90_000, undefined, 2)]))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'purchase'])
    expect(solversOf()).toEqual([SOLVER_A.solverPubkey, SOLVER_A.solverPubkey])
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('fall short'))
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('counts the dust an asset-bearing coin costs in change', async () => {
    const withAsset = { ...coin(Number(TAXI_PRICE), DEFAULT_FLOOR), assets: [{ assetId: ASSET_ID, amount: 1n }] }
    const d = deps(walletWith([withAsset]))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'purchase'])
  })

  it('asks no Taxi for a quote when no coin outlives the minimum floor', async () => {
    const d = deps(walletWith([coin(50_000, 1_700_001_000n), coin(50_000, undefined, 1)]))
    await payAssetRequest(REQUEST, d)
    expect(vi.mocked(d.fetch).mock.calls.map(([url]) => url)).toEqual([`${TAXI.url}/v1/info`])
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
  })

  it('buys a carrier when the Taxi prices a fare other than the one the receiver named', async () => {
    const d = deps({ fetch: taxiFetch({ info: TWO_FARES }) })
    await payAssetRequest({ ...REQUEST, taxi: { ...TAXI, fareId: 'cheap' } }, d)
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    onlyTheConfirmation(PURCHASE_PRICE)
  })

  it('asks the Taxi for no quote it could not price for the receiver, and buys a carrier', async () => {
    const share = { id: 'share', currency: 'sameAsset', pricing: { kind: 'proportional', bps: 1, minUnits: '1' } }
    const d = deps({
      fetch: taxiFetch({ info: { ...TWO_FARES, assetRules: [{ ...INFO.assetRules[0], fares: [share] }] } }),
    })
    await payAssetRequest({ ...REQUEST, taxi: { ...TAXI, fareId: 'share' } }, d)
    expect(vi.mocked(d.fetch).mock.calls.map(([url]) => url)).toEqual([`${TAXI.url}/v1/info`])
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('fare-unavailable'))
  })

  it('buys a carrier when the Taxi floor is too near to fund and claim before', async () => {
    const d = deps(walletWith([coin(50_000, 4_500_000_000n)]))
    d.arkade = { ...d.arkade, clock: async () => DEFAULT_FLOOR - 1_000n }
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/below the caller minimum/) }),
      expect.anything(),
    )
  })

  it('probes no Taxi when the request names none', async () => {
    const d = deps()
    await payAssetRequest({ ...REQUEST, taxi: undefined }, d)
    expect(d.fetch).not.toHaveBeenCalled()
    expect(carriersOf(d)).toEqual([{ mode: 'purchase' }])
  })
})

describe('payAssetRequest near the end of the Taxi quote', () => {
  const START = Date.UTC(2026, 8, 25, 12) / 1000
  let rfqs = 0
  const numbered = (d: AssetRfqSendDeps) => {
    vi.mocked(d.requestArkadeSwap).mockImplementation(async (_w, _u, _t, params) => ({
      ...negotiated(params.carrier?.mode === 'recycleReceiver' ? TAXI_PRICE : PURCHASE_PRICE),
      rfqId: `rfq-${++rfqs}`,
    }))
    return d
  }
  /** She approves each price the given number of seconds after it is shown; the last delay repeats. */
  const approvesAfter = (...seconds: number[]) => {
    const shown: AssetPaymentTerms[] = []
    const ui: PayRailUi = {
      confirmPayment: async (terms) => {
        if (shown.push(terms) > 3) throw new Error('asked a fourth time')
        vi.setSystemTime((Date.now() / 1000 + (seconds[shown.length - 1] ?? seconds.at(-1)!)) * 1000)
        return true
      },
    }
    return { ui, shown }
  }
  const fundedWith = (d: AssetRfqSendDeps) => vi.mocked(d.fundOffer).mock.calls.map(([, , params]) => params)

  beforeEach(() => {
    rfqs = 0
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(START * 1000)
  })
  afterEach(() => vi.useRealTimers())

  it('hands funding a deadline that leaves the solver the fill margin', async () => {
    const d = numbered(deps({ fetch: taxiFetch({ ttlSeconds: 600 }), ui: approvesAfter(5).ui }))
    await payAssetRequest(REQUEST, d)
    expect(fundedWith(d)).toEqual([
      expect.objectContaining({ id: 'rfq-1', validUntil: START + 600 - FILL_MARGIN_SECONDS }),
    ])
  })

  it('funds no offer confirmed too late to fill: it re-quotes the Taxi and asks again', async () => {
    const approval = approvesAfter(60 - FILL_MARGIN_SECONDS + 1, 5)
    const d = numbered(deps({ fetch: taxiFetch({ ttlSeconds: 60 }), ui: approval.ui }))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'recycleReceiver'])
    const requotedAt = START + 60 - FILL_MARGIN_SECONDS + 1
    expect(fundedWith(d)).toEqual([
      expect.objectContaining({ id: 'rfq-2', validUntil: requotedAt + 60 - FILL_MARGIN_SECONDS }),
    ])
    expect(approval.shown.map((terms) => terms.refreshed)).toEqual([undefined, true])
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('too late'))
  })

  it('buys a carrier after a second late confirmation, funding neither stale offer', async () => {
    const approval = approvesAfter(60 - FILL_MARGIN_SECONDS + 1)
    const d = numbered(deps({ fetch: taxiFetch({ ttlSeconds: 60 }), ui: approval.ui }))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'recycleReceiver', 'purchase'])
    expect(fundedWith(d)).toEqual([expect.not.objectContaining({ inputExpiryFloor: expect.anything() })])
    expect(fundedWith(d)[0].id).toBe('rfq-3')
    expect(approval.shown.map((terms) => terms.payAmountSats)).toEqual([TAXI_PRICE, TAXI_PRICE, PURCHASE_PRICE])
  })

  it('buys a carrier before asking when the Taxi quote leaves no time to fill', async () => {
    const d = numbered(deps({ fetch: taxiFetch({ ttlSeconds: FILL_MARGIN_SECONDS - 1 }) }))
    await payAssetRequest(REQUEST, d)
    expect(carriersOf(d).map((c) => c?.mode)).toEqual(['recycleReceiver', 'purchase'])
    expect(fundedWith(d)).toEqual([expect.objectContaining({ id: 'rfq-2' })])
    onlyTheConfirmation(PURCHASE_PRICE)
  })
})

describe('routesToReceiverTaxi', () => {
  const decoded = { assetId: ASSET_ID }
  const send = { assets: [{ assetId: ASSET_ID, amount: 500n }] }

  it('routes a Taxi-bearing asset request to the rail when the payer holds none of the asset', () => {
    expect(routesToReceiverTaxi(send, decoded, 0n)).toBe(true)
  })

  it('routes it to the rail when she holds some of the asset, but not enough', () => {
    expect(routesToReceiverTaxi(send, decoded, 499n)).toBe(true)
  })

  it('sends the asset directly, ignoring the Taxi, when she holds enough of it', () => {
    expect(routesToReceiverTaxi(send, decoded, 500n)).toBe(false)
    expect(routesToReceiverTaxi(send, decoded, 10_000n)).toBe(false)
  })

  it('leaves everything else on its existing path', () => {
    expect(routesToReceiverTaxi(send, undefined, 0n)).toBe(false)
    expect(routesToReceiverTaxi({ ...send, account: {} }, decoded, 0n)).toBe(false)
    expect(routesToReceiverTaxi({ assets: [{ assetId: USDT_ID, amount: 500n }] }, decoded, 0n)).toBe(false)
    expect(routesToReceiverTaxi({}, decoded, 0n)).toBe(false)
  })
})

describe('hasSatsForReceiverTaxi', () => {
  it('needs at least the server dust in liquid bitcoin', () => {
    expect(hasSatsForReceiverTaxi(329, 330n)).toBe(false)
    expect(hasSatsForReceiverTaxi(330, 330n)).toBe(true)
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
