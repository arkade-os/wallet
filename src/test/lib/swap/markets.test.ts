import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { planOffer, quoteOffer, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { discoverMarkets, findMarket, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

// the two mutinynet registry markets
const USDT_ID = 'f121ac9b7656797cc68d1e8fecacfbaa2069ec1461edf0bf2f3c37404cb9791a0000'
const DEPIX_ID = '47004bf4a5fbdb2221f708030528de68ea28f5980044e546b7bb5a352457d1f30000'

const btcUsdt: DiscoveredMarket = {
  pair: 'BTC/USDT',
  base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', precision: 8 },
  quote_asset: { id: USDT_ID, name: 'USDT', ticker: 'USDT', precision: 2 },
  price_feed: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  price_feed_schema: { type: 'json', price_path: '/bitcoin/usd' },
  price_decimals: 6,
  invert: false,
  fee_bps: 30,
  min_base_amount: 1000,
  max_base_amount: 5000000,
  solver: 'frenchman',
  source: 'registry',
  sourceType: 'registry',
}

const btcDepix: DiscoveredMarket = {
  ...btcUsdt,
  pair: 'BTC/DePix',
  quote_asset: { id: DEPIX_ID, name: 'Decentralized Pix', ticker: 'DePix', precision: 8 },
  price_feed: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
  price_feed_schema: { type: 'json', price_path: '/price' },
  price_decimals: 0,
  solver: 'jpmorgan',
}

const markets = [btcUsdt, btcDepix]

describe('findMarket', () => {
  it('maps btc->asset to giving the base side', () => {
    expect(findMarket(markets, 'btc', USDT_ID)).toEqual({ market: btcUsdt, give: 'base' })
    expect(findMarket(markets, 'btc', DEPIX_ID)).toEqual({ market: btcDepix, give: 'base' })
  })

  it('maps asset->btc to giving the quote side', () => {
    expect(findMarket(markets, USDT_ID, 'btc')).toEqual({ market: btcUsdt, give: 'quote' })
  })

  it('has no market for asset<->asset or same-asset pairs', () => {
    expect(findMarket(markets, USDT_ID, DEPIX_ID)).toBeUndefined()
    expect(findMarket(markets, 'btc', 'btc')).toBeUndefined()
  })

  it('returns a null market for unknown assets', () => {
    expect(findMarket(markets, 'btc', 'ff'.repeat(34))?.market).toBeNull()
  })
})

describe('quoteOffer with the wallet quote options', () => {
  it('quotes btc->usdt through the nested CoinGecko schema (fee + safety conceded)', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ bitcoin: { usd: 100000 } }),
    }))
    const plan = await quoteOffer(btcUsdt, {
      give: 'base',
      giveAmount: BigInt(10_000),
      fetchImpl,
      ...QUOTE_OPTIONS,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(plan.deposit.atomic).toBe(BigInt(10_000))
    // 10_000 sats * 0.1 cents/sat * (10000 - 30)bps = 997 cents
    expect(plan.receive.atomic).toBe(BigInt(997))
    expect(plan.receive.display).toBe('9.97')
    expect(plan.limits.withinLimits).toBe(true)
  })

  it('quotes usdt->btc in the same market (give quote side)', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ bitcoin: { usd: 100000 } }),
    }))
    const plan = await quoteOffer(btcUsdt, {
      give: 'quote',
      giveAmount: BigInt(1_000),
      fetchImpl,
      ...QUOTE_OPTIONS,
    })
    expect(plan.deposit.atomic).toBe(BigInt(1_000))
    // $10 / 0.1 cents-per-sat, minus the 30bps fee: 9970 sats
    expect(plan.receive.atomic).toBe(BigInt(9_970))
  })

  it('quotes btc->depix through the Binance /price schema', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ symbol: 'BTCBRL', price: '600000.00' }),
    }))
    const plan = await quoteOffer(btcDepix, {
      give: 'base',
      giveAmount: BigInt(10_000),
      fetchImpl,
      ...QUOTE_OPTIONS,
    })
    // 10_000 sats * 600_000 depix-atomic/sat * 9970bps = 59.82 DePix
    expect(plan.receive.atomic).toBe(BigInt(5_982_000_000))
    expect(plan.receive.display).toBe('59.82')
  })
})

describe.skip('discoverMarkets caching', () => {
  const CACHE_KEY = 'solverMarkets-mutinynet'
  // a valid registry index entry: btcUsdt without the fields discover() adds
  const indexMarket: Record<string, unknown> = { ...btcUsdt }
  delete indexMarket.source
  delete indexMarket.sourceType
  const registryIndex = () => ({
    version: 0,
    network: 'mutinynet',
    generated_at: Math.floor(Date.now() / 1000),
    commit: 'a'.repeat(40),
    markets: [indexMarket],
  })

  beforeEach(() => {
    localStorage.clear()
    fetchMocker.resetMocks()
  })

  it('fetches on a cold start and caches the result', async () => {
    fetchMocker.mockResponseOnce(JSON.stringify(registryIndex()))
    const markets = await discoverMarkets('mutinynet')
    expect(markets).toHaveLength(1)
    expect(markets[0].pair).toBe('BTC/USDT')
    expect(fetchMocker).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).markets).toHaveLength(1)
  })

  it('serves a fresh cache without fetching', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ markets: [btcUsdt], fetchedAt: Date.now() }))
    const markets = await discoverMarkets('mutinynet')
    expect(markets).toHaveLength(1)
    expect(fetchMocker).not.toHaveBeenCalled()
  })

  it('falls back to a stale cache when the registry is unreachable', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ markets: [btcUsdt], fetchedAt: 0 }))
    fetchMocker.mockRejectOnce(new Error('network down'))
    const markets = await discoverMarkets('mutinynet')
    expect(markets).toHaveLength(1)
    expect(fetchMocker).toHaveBeenCalledTimes(1)
  })

  it('resets a corrupt cache blob and fetches', async () => {
    localStorage.setItem(CACHE_KEY, '{not json')
    fetchMocker.mockResponseOnce(JSON.stringify(registryIndex()))
    const markets = await discoverMarkets('mutinynet')
    expect(markets).toHaveLength(1)
    expect(fetchMocker).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).markets).toHaveLength(1)
  })
})

describe('validatePlan', () => {
  const plan = (give: 'base' | 'quote', giveAmount: bigint) =>
    planOffer({ market: btcUsdt, give, feedValue: 100000, giveAmount, safetyBps: 0 })

  it('accepts a plan within balance and limits', () => {
    expect(validatePlan(plan('base', BigInt(10_000)), BigInt(20_000), BigInt(330))).toBeUndefined()
  })

  it('flags insufficient balance', () => {
    expect(validatePlan(plan('base', BigInt(10_000)), BigInt(5_000), BigInt(330))).toBe('insufficient-balance')
  })

  it('flags amounts outside the market limits', () => {
    expect(validatePlan(plan('base', BigInt(500)), BigInt(20_000), BigInt(330))).toBe('below-min')
    expect(validatePlan(plan('base', BigInt(6_000_000)), BigInt(10_000_000), BigInt(330))).toBe('above-max')
  })

  it('flags a btc side below dust', () => {
    // giving quote: the received btc must be a viable VTXO
    const p = plan('quote', BigInt(152)) // -> 1515 sats, within limits
    expect(validatePlan(p, BigInt(1_000), BigInt(2_000))).toBe('below-dust')
    expect(validatePlan(p, BigInt(1_000), BigInt(330))).toBeUndefined()
  })
})
