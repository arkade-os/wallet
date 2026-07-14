import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { planOffer, quoteOffer, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { findMarket, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'

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
    fetchMocker.mockResponseOnce(JSON.stringify({ bitcoin: { usd: 100000 } }))
    const plan = await quoteOffer(btcUsdt, { give: 'base', giveAmount: 10_000n, ...QUOTE_OPTIONS })
    expect(plan.deposit.atomic).toBe(10_000n)
    // 10_000 sats * 0.1 cents/sat * (10000 - 30 - 50)bps = 992 cents
    expect(plan.receive.atomic).toBe(992n)
    expect(plan.receive.display).toBe('9.92')
    expect(plan.limits.withinLimits).toBe(true)
  })

  it('quotes usdt->btc in the same market (give quote side)', async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ bitcoin: { usd: 100000 } }))
    const plan = await quoteOffer(btcUsdt, { give: 'quote', giveAmount: 1_000n, ...QUOTE_OPTIONS })
    expect(plan.deposit.atomic).toBe(1_000n)
    // $10 / 0.1 cents-per-sat, minus 80bps: 9920 sats
    expect(plan.receive.atomic).toBe(9_920n)
  })

  it('quotes btc->depix through the Binance /price schema', async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ symbol: 'BTCBRL', price: '600000.00' }))
    const plan = await quoteOffer(btcDepix, { give: 'base', giveAmount: 10_000n, ...QUOTE_OPTIONS })
    // 10_000 sats * 600_000 depix-atomic/sat * 9920bps = 59.52 DePix
    expect(plan.receive.atomic).toBe(5_952_000_000n)
    expect(plan.receive.display).toBe('59.52')
  })
})

describe('validatePlan', () => {
  const plan = (give: 'base' | 'quote', giveAmount: bigint) =>
    planOffer({ market: btcUsdt, give, feedValue: 100000, giveAmount, safetyBps: 50 })

  it('accepts a plan within balance and limits', () => {
    expect(validatePlan(plan('base', 10_000n), 20_000n, 330n)).toBeUndefined()
  })

  it('flags insufficient balance', () => {
    expect(validatePlan(plan('base', 10_000n), 5_000n, 330n)).toBe('insufficient-balance')
  })

  it('flags amounts outside the market limits', () => {
    expect(validatePlan(plan('base', 500n), 20_000n, 330n)).toBe('below-min')
    expect(validatePlan(plan('base', 6_000_000n), 10_000_000n, 330n)).toBe('above-max')
  })

  it('flags a btc side below dust', () => {
    // giving quote: the received btc must be a viable VTXO
    const p = plan('quote', 152n) // -> 1507 sats, within limits
    expect(validatePlan(p, 1_000n, 2_000n)).toBe('below-dust')
    expect(validatePlan(p, 1_000n, 330n)).toBeUndefined()
  })
})
