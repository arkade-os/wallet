import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDiscoveryCaches,
  fetchIndex,
  IndexMarket,
  loadSources,
  mergeMarkets,
  parseIndex,
  quoteOffer,
  SourceResult,
  staleness,
} from '../../../lib/discovery'
import { assetPairId, discoveryNetwork, quoteSwap } from '../../../lib/discovery/wallet'
import {
  BTC_USDT_ID_PAIR,
  btcAsset,
  DEPIX_ID,
  depixMarket,
  index,
  jsonResponse,
  market,
  NOW_SECONDS,
  usdtAsset,
} from './fixtures'

const REGISTRY_A = 'https://registry-a.example.com'
const REGISTRY_B = 'https://registry-b.example.com'
const now = () => NOW_SECONDS * 1000

/** Route fetches by URL prefix: registries serve indexes, feeds serve prices. */
const routedFetch = (routes: Record<string, unknown>) =>
  vi.fn(async (url: string) => {
    for (const [prefix, data] of Object.entries(routes)) {
      if (!url.startsWith(prefix)) continue
      if (typeof data === 'function') return data()
      return jsonResponse(data, data === undefined ? 500 : 200)
    }
    return jsonResponse({}, 404)
  }) as unknown as typeof fetch

beforeEach(() => clearDiscoveryCaches())

describe('fetchIndex / parseIndex', () => {
  it('fetches and parses <base-url>/<network>.json', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index() })
    const result = await fetchIndex(`${REGISTRY_A}/`, 'mutinynet', { fetchFn, now })
    expect(fetchFn).toHaveBeenCalledWith(`${REGISTRY_A}/mutinynet.json`)
    expect(result.markets).toEqual([market()])
  })

  it('rejects an unknown version loudly', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index({ version: 1 as 0 }) })
    await expect(fetchIndex(REGISTRY_A, 'mutinynet', { fetchFn, now })).rejects.toThrow(/version/)
  })

  it('rejects a network mismatch: a mutinynet wallet must not price from a signet index', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index({ network: 'signet' }) })
    await expect(fetchIndex(REGISTRY_A, 'mutinynet', { fetchFn, now })).rejects.toThrow(/network mismatch/)
  })

  it('rejects unknown fields with the offending key in the message', async () => {
    expect(() => parseIndex({ ...index(), ark_server: 'https://evil.example.com' })).toThrow(
      /unknown field "ark_server"/,
    )
    expect(() =>
      parseIndex(index({ markets: [market({ base_asset: { ...btcAsset, url: 'x' } as unknown as never })] })),
    ).toThrow(/unknown field "url"/)
  })

  it('normalizes asset ids to lowercase and rejects a pair label disagreeing with tickers', () => {
    const upper = parseIndex(
      index({ markets: [market({ quote_asset: { ...usdtAsset, id: usdtAsset.id.toUpperCase() } })] }),
    )
    expect(upper.markets[0].quote_asset.id).toBe(usdtAsset.id)
    expect(() => parseIndex(index({ markets: [market({ pair: 'BTC/USDC' })] }))).toThrow(/does not match asset tickers/)
    expect(() => parseIndex(index({ markets: [market({ min_base_amount: 10, max_base_amount: 9 })] }))).toThrow(
      /min_base_amount exceeds/,
    )
  })

  it('serves from the TTL cache within 10 minutes and refetches after', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index() })
    let clock = NOW_SECONDS * 1000
    await fetchIndex(REGISTRY_A, 'mutinynet', { fetchFn, now: () => clock })
    clock += 9 * 60 * 1000
    await fetchIndex(REGISTRY_A, 'mutinynet', { fetchFn, now: () => clock })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    clock += 2 * 60 * 1000
    await fetchIndex(REGISTRY_A, 'mutinynet', { fetchFn, now: () => clock })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('computes staleness from generated_at and flags beyond 7 days', () => {
    expect(staleness({ generated_at: NOW_SECONDS - 3600 }, { now })).toEqual({ ageSeconds: 3600, stale: false })
    const eightDays = 8 * 24 * 60 * 60
    expect(staleness({ generated_at: NOW_SECONDS - eightDays }, { now })).toEqual({
      ageSeconds: eightDays,
      stale: true,
    })
  })
})

describe('mergeMarkets — the reduced cross-registry array', () => {
  const src = (source: string, markets: IndexMarket[]): SourceResult => ({ source, ok: true, markets })

  it('unions two registries, drops byte-identical duplicates, re-ranks by fee_bps', () => {
    const cheap = market({ solver: 'cheap-solver', fee_bps: 10, price_feed: 'https://feed.example.com/cheap' })
    const shared = market({ solver: 'arklabs-solver', fee_bps: 30 })
    const mid = market({ solver: 'mid-solver', fee_bps: 20, price_feed: 'https://feed.example.com/mid' })

    const merged = mergeMarkets([src(REGISTRY_A, [shared, cheap]), src(REGISTRY_B, [shared, mid])], BTC_USDT_ID_PAIR)

    // exactly three entries: the byte-identical duplicate of arklabs-solver is
    // dropped (kept under its first source), ranked ascending by fee_bps.
    expect(merged).toEqual([
      { ...cheap, source: REGISTRY_A },
      { ...mid, source: REGISTRY_B },
      { ...shared, source: REGISTRY_A },
    ])
  })

  it('keeps a cross-registry name collision as two distinct entries (never keyed by name alone)', () => {
    const inA = market({ solver: 'alpha', fee_bps: 30, price_feed: 'https://feed-a.example.com' })
    const inB = market({ solver: 'alpha', fee_bps: 25, price_feed: 'https://feed-b.example.com' })
    expect(mergeMarkets([src(REGISTRY_A, [inA]), src(REGISTRY_B, [inB])], BTC_USDT_ID_PAIR)).toEqual([
      { ...inB, source: REGISTRY_B },
      { ...inA, source: REGISTRY_A },
    ])
  })

  it('breaks fee ties by source order', () => {
    const inA = market({ solver: 'a-solver', price_feed: 'https://feed-a.example.com' })
    const inB = market({ solver: 'b-solver', price_feed: 'https://feed-b.example.com' })
    const merged = mergeMarkets([src(REGISTRY_A, [inA]), src(REGISTRY_B, [inB])], BTC_USDT_ID_PAIR)
    expect(merged.map((m) => m.solver)).toEqual(['a-solver', 'b-solver'])
  })

  it('matches by id pair, never by the ticker label', () => {
    const impostorUsdt = { id: '00ff' + 'ee'.repeat(32), name: 'Tether USD', ticker: 'USDT', precision: 6 }
    const impostor = market({ solver: 'impostor', quote_asset: impostorUsdt, fee_bps: 1 })
    // Both markets carry the display label BTC/USDT, but only the genuine id
    // pair matches — the impostor's cheaper fee must not win the ranking.
    const merged = mergeMarkets([src(REGISTRY_A, [market(), impostor])], BTC_USDT_ID_PAIR)
    expect(merged.map((m) => m.solver)).toEqual(['arklabs-solver'])
  })

  it('ignores failed sources without blocking the healthy ones', () => {
    const dead: SourceResult = { source: 'registry-dead', ok: false, error: new Error('HTTP 500'), markets: [] }
    const merged = mergeMarkets([dead, src(REGISTRY_B, [market()])], BTC_USDT_ID_PAIR)
    expect(merged).toEqual([{ ...market(), source: REGISTRY_B }])
  })
})

describe('loadSources', () => {
  it('isolates a dead registry: one 500 never blocks the other', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index(), [REGISTRY_B]: undefined })
    const sources = await loadSources({ registryUrls: [REGISTRY_A, REGISTRY_B], network: 'mutinynet', fetchFn, now })
    expect(sources[0]).toMatchObject({ ok: true, staleness: { ageSeconds: 3600, stale: false } })
    expect(sources[1].ok).toBe(false)
    expect(sources[1].error?.message).toMatch(/500/)
  })
})

describe('quoteOffer', () => {
  const base = { network: 'mutinynet', pair: BTC_USDT_ID_PAIR, depositAmount: BigInt(100000), now }

  it('selects the best market across merged sources and prices from its feed', async () => {
    const expensive = market({ solver: 'expensive', fee_bps: 50, price_feed: 'https://feed.example.com/expensive' })
    const cheap = market({ solver: 'cheap', fee_bps: 10, price_feed: 'https://feed.example.com/cheap' })
    const fetchFn = routedFetch({
      [REGISTRY_A]: index({ markets: [expensive] }),
      [REGISTRY_B]: index({ markets: [cheap] }),
      'https://feed.example.com/cheap': { price: '6500000000000' }, // 65000 * 10^8
      'https://feed.example.com/expensive': { price: '9999900000000' },
    })

    const result = await quoteOffer({
      ...base,
      registryUrls: [REGISTRY_A, REGISTRY_B],
      direction: 'base-to-quote',
      safetyBps: 50,
      fetchFn,
    })

    expect(result.solver).toBe('cheap')
    expect(result.source).toBe(REGISTRY_B)
    // floor(100000 * 65000 * (1 - 60/10000))
    expect(result.wantAmount).toBe(BigInt(6461000000))
    expect(result.staleness).toEqual({ ageSeconds: 3600, stale: false })
  })

  it('falls through to the next market when the best feed is down', async () => {
    const cheapDeadFeed = market({ solver: 'cheap', fee_bps: 10, price_feed: 'https://feed.example.com/dead' })
    const backup = market({ solver: 'backup', price_feed: 'https://feed.example.com/alive' })
    const fetchFn = routedFetch({
      [REGISTRY_A]: index({ markets: [cheapDeadFeed, backup] }),
      'https://feed.example.com/dead': undefined, // 500
      'https://feed.example.com/alive': '6500000000000',
    })
    const result = await quoteOffer({ ...base, registryUrls: [REGISTRY_A], direction: 'base-to-quote', fetchFn })
    expect(result.solver).toBe('backup')
  })

  it('reports a browser-blocked (CORS) feed distinctly when no market can price', async () => {
    const fetchFn = routedFetch({
      [REGISTRY_A]: index(),
      'https://feed.example.com/btcusdt': () => {
        throw new TypeError('Failed to fetch')
      },
    })
    const promise = quoteOffer({ ...base, registryUrls: [REGISTRY_A], direction: 'base-to-quote', fetchFn })
    await expect(promise).rejects.toMatchObject({ code: 'feed', maybeCors: true })
  })

  it('distinguishes size-bound rejections from unlisted pairs', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index() }) // bounds: 1000..5000000
    const sized = { ...base, registryUrls: [REGISTRY_A], direction: 'base-to-quote' as const, fetchFn }
    await expect(quoteOffer({ ...sized, depositAmount: BigInt(999) })).rejects.toMatchObject({ code: 'size' })
    await expect(quoteOffer({ ...sized, pair: `${DEPIX_ID}/btc` })).rejects.toMatchObject({ code: 'no-market' })
  })

  it('enforces base-denominated bounds on the wantAmount when wanting base', async () => {
    // Wanting base: deposit quote, receive base. P = 65000, so a 1000 quote
    // deposit yields ~0 base units — far below min_base_amount.
    const fetchFn = routedFetch({ [REGISTRY_A]: index(), 'https://feed.example.com/btcusdt': '6500000000000' })
    await expect(
      quoteOffer({
        ...base,
        depositAmount: BigInt(1000),
        registryUrls: [REGISTRY_A],
        direction: 'quote-to-base',
        fetchFn,
      }),
    ).rejects.toMatchObject({ code: 'size' })
  })

  it('throws a distinct error when every source fails', async () => {
    const fetchFn = routedFetch({})
    await expect(
      quoteOffer({ ...base, registryUrls: [REGISTRY_A, REGISTRY_B], direction: 'base-to-quote', fetchFn }),
    ).rejects.toMatchObject({ code: 'sources' })
  })
})

describe('wallet adapter', () => {
  it('maps wallet asset ids onto discovery asset ids (same id, canonical case)', () => {
    expect(assetPairId('btc')).toBe('btc')
    expect(assetPairId(DEPIX_ID)).toBe(DEPIX_ID)
    expect(assetPairId(DEPIX_ID.toUpperCase())).toBe(DEPIX_ID)
    expect(assetPairId('account:usd')).toBeUndefined()
  })

  it('maps wallet network names onto registry partitions', () => {
    expect(discoveryNetwork('bitcoin')).toBe('mainnet')
    expect(discoveryNetwork('mutinynet')).toBe('mutinynet')
    expect(discoveryNetwork('')).toBeUndefined()
  })

  const depix = depixMarket({ price_decimals: 0, fee_bps: 0, min_base_amount: 1, max_base_amount: 100000000 })
  const registry = { [REGISTRY_A]: index({ markets: [depix] }), 'https://feed.example.com/depix': '2' }

  it('quotes DePix -> BTC through a market listed with DePix as base (base-to-quote)', async () => {
    const result = await quoteSwap({
      fromAssetId: DEPIX_ID,
      toAssetId: 'btc',
      depositAmount: BigInt(10000),
      network: 'mutinynet',
      registryUrls: [REGISTRY_A],
      safetyBps: 50,
      fetchFn: routedFetch(registry),
      now,
    })
    expect(result.direction).toBe('base-to-quote')
    expect(result.pair).toBe(`${DEPIX_ID}/btc`)
    // floor(10000 * 2 * (1 - 50/10000))
    expect(result.wantAmount).toBe(BigInt(19900))
  })

  it('quotes BTC -> DePix through the same market (quote-to-base, symmetric with 1/P)', async () => {
    const result = await quoteSwap({
      fromAssetId: 'btc',
      toAssetId: DEPIX_ID,
      depositAmount: BigInt(19900),
      network: 'mutinynet',
      registryUrls: [REGISTRY_A],
      safetyBps: 0,
      fetchFn: routedFetch(registry),
      now,
    })
    expect(result.direction).toBe('quote-to-base')
    expect(result.wantAmount).toBe(BigInt(9950))
  })

  it('rejects swaps between non-discoverable assets', async () => {
    await expect(
      quoteSwap({
        fromAssetId: 'account:usd',
        toAssetId: 'btc',
        depositAmount: BigInt(1),
        network: 'mutinynet',
        registryUrls: [],
      }),
    ).rejects.toMatchObject({ code: 'no-market' })
  })
})
