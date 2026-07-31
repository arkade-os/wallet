import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { planOffer, quoteOffer, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { discoverMarkets, findMarket, preFeeDisplayRate, QUOTE_OPTIONS, validatePlan } from '../../../lib/swap/markets'
import { btcDepix, btcUsdt, DEPIX_ID, MARAT_ID, maratNapo, NAPO_ID, USDT_ID } from './fixtures'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const markets = [btcUsdt, btcDepix]

describe('findMarket', () => {
  it('maps btc->asset to giving the base side', () => {
    expect(findMarket(markets, 'btc', USDT_ID)).toEqual({ market: btcUsdt, give: 'base' })
    expect(findMarket(markets, 'btc', DEPIX_ID)).toEqual({ market: btcDepix, give: 'base' })
  })

  it('maps asset->btc to giving the quote side', () => {
    expect(findMarket(markets, USDT_ID, 'btc')).toEqual({ market: btcUsdt, give: 'quote' })
  })

  it('maps asset<->asset pairs in both orientations (#857)', () => {
    const withShitcoins = [...markets, maratNapo]
    expect(findMarket(withShitcoins, MARAT_ID, NAPO_ID)).toEqual({ market: maratNapo, give: 'base' })
    expect(findMarket(withShitcoins, NAPO_ID, MARAT_ID)).toEqual({ market: maratNapo, give: 'quote' })
  })

  it('has no market for unserved asset<->asset pairs, none at all for same-asset', () => {
    expect(findMarket(markets, USDT_ID, DEPIX_ID)?.market).toBeNull()
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
    fetchMocker.mockResponseOnce(JSON.stringify({ bitcoin: { usd: 100000 } }))
    const plan = await quoteOffer(btcUsdt, { give: 'quote', giveAmount: BigInt(1_000), ...QUOTE_OPTIONS })
    expect(plan.deposit.atomic).toBe(BigInt(1_000))
    // $10 / 0.1 cents-per-sat, minus the 30bps fee: 9970 sats
    expect(plan.receive.atomic).toBe(BigInt(9_970))
  })

  it('quotes btc->depix through the Binance /price schema', async () => {
    fetchMocker.mockResponseOnce(JSON.stringify({ symbol: 'BTCBRL', price: '600000.00' }))
    const plan = await quoteOffer(btcDepix, { give: 'base', giveAmount: BigInt(10_000), ...QUOTE_OPTIONS })
    // 10_000 sats * 600_000 depix-atomic/sat * 9970bps = 59.82 DePix
    expect(plan.receive.atomic).toBe(BigInt(5_982_000_000))
    expect(plan.receive.display).toBe('59.82')
  })
})

describe('preFeeDisplayRate', () => {
  it('quotes the feed price giving the base side and its inverse giving the quote side', () => {
    const base = planOffer({ market: btcUsdt, give: 'base', giveAmount: BigInt(10_000), feedValue: 100_000 })
    expect(preFeeDisplayRate(base)).toBe(100_000)
    const quote = planOffer({ market: btcUsdt, give: 'quote', giveAmount: BigInt(1_000), feedValue: 100_000 })
    expect(preFeeDisplayRate(quote)).toBe(0.00001)
  })

  it('survives display prices below the 8-decimal floor of plan.priceDisplay', () => {
    // a registry may publish BTC as the QUOTE asset; a base token worth under
    // a satoshi then has a display price that priceDisplay truncates to
    // "0.00000000" — the exact rational must still price the Rate row
    const tokenBtc: DiscoveredMarket = {
      ...btcUsdt,
      pair: 'TOKEN/BTC',
      base_asset: { id: 'aa'.repeat(34), name: 'Token', ticker: 'TOK', decimals: 8 },
      quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      price_decimals: 0,
    }
    const base = planOffer({
      market: tokenBtc,
      give: 'base',
      giveAmount: BigInt(100_000_000),
      feedValue: '0.000000005',
    })
    expect(Number(base.priceDisplay)).toBe(0)
    expect(preFeeDisplayRate(base)).toBe(5e-9)
    const quote = planOffer({ market: tokenBtc, give: 'quote', giveAmount: BigInt(1_000), feedValue: '0.000000005' })
    expect(preFeeDisplayRate(quote)).toBe(200_000_000)
  })
})

describe('discoverMarkets caching', () => {
  const CACHE_KEY = 'swapMarkets-mutinynet-https://arkade-os.github.io/solver-registry/mutinynet.json'
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

  it('clears the stale cache when the registry is reachable but emptied', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ markets: [btcUsdt], fetchedAt: 0 }))
    fetchMocker.mockResponseOnce(JSON.stringify({ ...registryIndex(), markets: [] }))
    const markets = await discoverMarkets('mutinynet')
    expect(markets).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(CACHE_KEY)!).markets).toHaveLength(0)
  })

  it('refetches when a cached market is malformed', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ markets: [null], fetchedAt: Date.now() }))
    fetchMocker.mockResponseOnce(JSON.stringify(registryIndex()))
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

  it('enforces the card give-side floor the SDK limits omit', () => {
    // 700 sats pays out ~$0.70 — above the converted receive minimum ($0.50),
    // but below the card's 1,000-sat min_base_amount; the solver would reject
    // this at fill, so the wallet must flag it up front
    expect(validatePlan(plan('base', BigInt(700)), BigInt(20_000), BigInt(330))).toBe('below-min')
  })

  it('flags a btc side below dust', () => {
    // giving quote: the received btc must be a viable VTXO
    const p = plan('quote', BigInt(152)) // -> 1515 sats, within limits
    expect(validatePlan(p, BigInt(1_000), BigInt(2_000))).toBe('below-dust')
    expect(validatePlan(p, BigInt(1_000), BigInt(330))).toBeUndefined()
  })

  it('skips the dust check when neither leg is BTC (#857)', () => {
    // both atomic sides sit under the sat dust number, but neither is sats:
    // asset deposits and fills ride the SDK's own dust carriers, so there is
    // no BTC leg for the wallet to protect
    const p = planOffer({ market: maratNapo, give: 'base', feedValue: 1, giveAmount: BigInt(200), safetyBps: 0 })
    expect(validatePlan(p, BigInt(1_000), BigInt(330))).toBeUndefined()
  })

  it('picks the dust leg by asset id, not market orientation', () => {
    // a registry may publish BTC as the QUOTE asset; giving base then means
    // depositing the token, and dust must bound the received btc side
    const usdtBtc = {
      ...btcUsdt,
      pair: 'USDT/BTC',
      base_asset: btcUsdt.quote_asset,
      quote_asset: btcUsdt.base_asset,
      min_base_amount: btcUsdt.min_quote_amount,
      max_base_amount: btcUsdt.max_quote_amount,
      min_quote_amount: btcUsdt.min_base_amount,
      max_quote_amount: btcUsdt.max_base_amount,
      price_decimals: 0,
    }
    // 1 USDT-cent -> 10 sats: 200 cents receives ~1994 sats (post-fee)
    const p = planOffer({ market: usdtBtc, give: 'base', feedValue: 10, giveAmount: BigInt(200), safetyBps: 0 })
    // deposit atomic (200) is below the 330-sat dust number, but the btc leg
    // (~1994 sats) is fine — orientation-based selection would false-reject
    expect(validatePlan(p, BigInt(1_000), BigInt(330))).toBeUndefined()
    // and a genuinely sub-dust btc receive is still caught
    expect(validatePlan(p, BigInt(1_000), BigInt(2_500))).toBe('below-dust')
  })
})
