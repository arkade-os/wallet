import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscoveryValidationError, NetworkMismatchError } from '../../../lib/discovery/errors'
import {
  clearIndexCache,
  fetchIndex,
  indexUrl,
  loadSources,
  mergeMarkets,
  parseIndex,
  parseSolverCard,
  staleness,
} from '../../../lib/discovery/index-client'
import { IndexMarket, SourceResult } from '../../../lib/discovery/types'
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

const fetchReturning = (data: unknown, status = 200) => vi.fn(async () => jsonResponse(data, status))

beforeEach(() => clearIndexCache())

describe('fetchIndex', () => {
  const now = () => NOW_SECONDS * 1000

  it('fetches and parses <base-url>/<network>.json', async () => {
    const fetchFn = fetchReturning(index())
    const result = await fetchIndex('https://registry.example.com/', 'mutinynet', { fetchFn, now })
    expect(fetchFn).toHaveBeenCalledWith('https://registry.example.com/mutinynet.json')
    expect(result.network).toBe('mutinynet')
    expect(result.markets).toHaveLength(1)
    expect(result.markets[0]).toEqual(market())
  })

  it('rejects an unknown version loudly', async () => {
    const fetchFn = fetchReturning(index({ version: 1 as 0 }))
    await expect(fetchIndex('https://r.example.com', 'mutinynet', { fetchFn, now })).rejects.toThrow(/version/)
  })

  it('rejects a network mismatch: a mutinynet wallet must not price from a signet index', async () => {
    const fetchFn = fetchReturning(index({ network: 'signet' }))
    await expect(fetchIndex('https://r.example.com', 'mutinynet', { fetchFn, now })).rejects.toThrow(
      NetworkMismatchError,
    )
  })

  it('rejects unknown fields with the offending key in the message', async () => {
    const fetchFn = fetchReturning({ ...index(), ark_server: 'https://evil.example.com' })
    await expect(fetchIndex('https://r.example.com', 'mutinynet', { fetchFn, now })).rejects.toThrow(
      /unknown field "ark_server"/,
    )
  })

  it('serves from the TTL cache within 10 minutes and refetches after', async () => {
    const fetchFn = fetchReturning(index())
    let clock = NOW_SECONDS * 1000
    const tickingNow = () => clock

    await fetchIndex('https://r.example.com', 'mutinynet', { fetchFn, now: tickingNow })
    clock += 9 * 60 * 1000
    await fetchIndex('https://r.example.com', 'mutinynet', { fetchFn, now: tickingNow })
    expect(fetchFn).toHaveBeenCalledTimes(1)

    clock += 2 * 60 * 1000
    await fetchIndex('https://r.example.com', 'mutinynet', { fetchFn, now: tickingNow })
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
})

describe('parseIndex / parseSolverCard validation', () => {
  it('accepts field order changes (objects are parsed by key, not position)', () => {
    const reordered = JSON.parse(
      JSON.stringify({
        markets: index().markets,
        commit: 'deadbeef',
        generated_at: 1,
        network: 'mutinynet',
        version: 0,
      }),
    )
    expect(parseIndex(reordered).network).toBe('mutinynet')
  })

  it('normalizes asset ids to lowercase hex (identity lives in the id, not the label)', () => {
    const parsed = parseIndex(
      index({ markets: [market({ quote_asset: { ...usdtAsset, id: usdtAsset.id.toUpperCase() } })] }),
    )
    expect(parsed.markets[0].quote_asset.id).toBe(usdtAsset.id)
  })

  it('rejects a pair label that disagrees with the asset tickers', () => {
    expect(() => parseIndex(index({ markets: [market({ pair: 'BTC/USDC' })] }))).toThrow(/does not match asset tickers/)
    expect(() => parseIndex(index({ markets: [market({ pair: 'BTC-USDT' })] }))).toThrow(/does not match asset tickers/)
  })

  it('rejects malformed asset ids and identical base/quote ids', () => {
    expect(() => parseIndex(index({ markets: [market({ base_asset: { ...btcAsset, id: 'not hex!' } })] }))).toThrow(
      /malformed asset id/,
    )
    expect(() => parseIndex(index({ markets: [market({ pair: 'BTC/BTC', quote_asset: { ...btcAsset } })] }))).toThrow(
      /must differ/,
    )
  })

  it('rejects unknown fields inside asset descriptors', () => {
    expect(() =>
      parseIndex(
        index({
          markets: [market({ base_asset: { ...btcAsset, ark_server: 'x' } as unknown as typeof btcAsset })],
        }),
      ),
    ).toThrow(/unknown field "ark_server"/)
  })

  it('rejects min_base_amount above max_base_amount', () => {
    expect(() => parseIndex(index({ markets: [market({ min_base_amount: 10, max_base_amount: 9 })] }))).toThrow(
      /min_base_amount exceeds max_base_amount/,
    )
  })

  it('rejects a card whose sig comes without discovery_pubkey', () => {
    expect(() => parseSolverCard({ version: 0, name: 'x', sig: 'a'.repeat(128), markets: [] })).toThrow(
      /sig requires discovery_pubkey/,
    )
  })
})

describe('staleness', () => {
  it('computes age from generated_at and flags beyond 7 days', () => {
    const now = () => NOW_SECONDS * 1000
    expect(staleness({ generated_at: NOW_SECONDS - 3600 }, { now })).toEqual({ ageSeconds: 3600, stale: false })
    const eightDays = 8 * 24 * 60 * 60
    expect(staleness({ generated_at: NOW_SECONDS - eightDays }, { now })).toEqual({
      ageSeconds: eightDays,
      stale: true,
    })
  })
})

describe('mergeMarkets — the reduced cross-registry array', () => {
  const src = (source: string, markets: IndexMarket[], userAdded = false): SourceResult => ({
    source,
    userAdded,
    ok: true,
    markets,
  })

  const pair = BTC_USDT_ID_PAIR

  it('unions two registries, drops byte-identical duplicates, re-ranks by fee_bps', () => {
    const cheap = market({ solver: 'cheap-solver', fee_bps: 10, price_feed: 'https://feed.example.com/cheap' })
    const shared = market({ solver: 'arklabs-solver', fee_bps: 30 })
    const mid = market({ solver: 'mid-solver', fee_bps: 20, price_feed: 'https://feed.example.com/mid' })

    const merged = mergeMarkets(
      [src('https://registry-a.example.com', [shared, cheap]), src('https://registry-b.example.com', [shared, mid])],
      pair,
    )

    // exactly three entries: the byte-identical duplicate of arklabs-solver is
    // dropped (kept under its first source), ranked ascending by fee_bps.
    expect(merged).toEqual([
      { ...cheap, source: 'https://registry-a.example.com', userAdded: false },
      { ...mid, source: 'https://registry-b.example.com', userAdded: false },
      { ...shared, source: 'https://registry-a.example.com', userAdded: false },
    ])
  })

  it('keeps a cross-registry name collision as two distinct entries (never keyed by name alone)', () => {
    const inA = market({ solver: 'alpha', fee_bps: 30, price_feed: 'https://feed-a.example.com' })
    const inB = market({ solver: 'alpha', fee_bps: 25, price_feed: 'https://feed-b.example.com' })

    const merged = mergeMarkets([src('registry-a', [inA]), src('registry-b', [inB])], pair)

    expect(merged).toEqual([
      { ...inB, source: 'registry-b', userAdded: false },
      { ...inA, source: 'registry-a', userAdded: false },
    ])
  })

  it('breaks fee ties by source order', () => {
    const inA = market({ solver: 'a-solver', fee_bps: 30, price_feed: 'https://feed-a.example.com' })
    const inB = market({ solver: 'b-solver', fee_bps: 30, price_feed: 'https://feed-b.example.com' })

    const merged = mergeMarkets([src('registry-a', [inA]), src('registry-b', [inB])], pair)

    expect(merged.map((m) => m.solver)).toEqual(['a-solver', 'b-solver'])
  })

  it('filters by id pair and by base-denominated size bounds (non-BTC-base pair)', () => {
    const depix = depixMarket({ min_base_amount: 100000, max_base_amount: 10000000 })
    const sources = [src('registry-a', [market(), depix])]
    const idPair = `${DEPIX_ID}/btc`

    expect(mergeMarkets(sources, idPair)).toHaveLength(1)
    expect(mergeMarkets(sources, idPair, BigInt(100000))).toHaveLength(1) // at min
    expect(mergeMarkets(sources, idPair, BigInt(10000000))).toHaveLength(1) // at max
    expect(mergeMarkets(sources, idPair, BigInt(99999))).toHaveLength(0) // below min
    expect(mergeMarkets(sources, idPair, BigInt(10000001))).toHaveLength(0) // above max
  })

  it('never groups by the ticker label: same label, different ids stay separate pairs', () => {
    const impostorUsdt = { id: '00ff' + 'ee'.repeat(32), name: 'Tether USD', ticker: 'USDT', precision: 6 }
    const impostor = market({ solver: 'impostor', quote_asset: impostorUsdt, fee_bps: 1 })
    const sources = [src('registry-a', [market(), impostor])]

    // Both markets carry the display label BTC/USDT, but only the genuine id
    // pair matches — the impostor's cheaper fee must not win the ranking.
    const merged = mergeMarkets(sources, pair)
    expect(merged).toHaveLength(1)
    expect(merged[0].solver).toBe('arklabs-solver')
  })

  it('ignores failed sources without blocking the healthy ones', () => {
    const healthy = market({ solver: 'healthy', fee_bps: 15, price_feed: 'https://feed.example.com/h' })
    const merged = mergeMarkets(
      [
        { source: 'registry-dead', userAdded: false, ok: false, error: new Error('HTTP 500'), markets: [] },
        src('registry-alive', [healthy]),
      ],
      pair,
    )
    expect(merged).toEqual([{ ...healthy, source: 'registry-alive', userAdded: false }])
  })
})

describe('loadSources', () => {
  const registryA = 'https://registry-a.example.com'
  const registryB = 'https://registry-b.example.com'
  const now = () => NOW_SECONDS * 1000

  it('isolates a dead registry: one 500 never blocks the other', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.startsWith(registryA) ? jsonResponse(index()) : jsonResponse({}, 500),
    ) as unknown as typeof fetch

    const sources = await loadSources({ registryUrls: [registryA, registryB], network: 'mutinynet', fetchFn, now })

    expect(sources).toHaveLength(2)
    expect(sources[0].ok).toBe(true)
    expect(sources[0].staleness).toEqual({ ageSeconds: 3600, stale: false })
    expect(sources[1].ok).toBe(false)
    expect(sources[1].error?.message).toMatch(/500/)
    expect(mergeMarkets(sources, BTC_USDT_ID_PAIR)).toHaveLength(1)
  })

  it('includes a user-pinned card, flagged userAdded, merging like any registry entry', async () => {
    const card = {
      version: 0,
      name: 'pinned-solver',
      markets: [
        {
          pair: 'BTC/USDT',
          base_asset: btcAsset,
          quote_asset: usdtAsset,
          price_feed: 'https://feed.example.com/pinned',
          price_decimals: 8,
          invert: false,
          fee_bps: 5,
          min_base_amount: 1,
          max_base_amount: 10000000,
        },
      ],
    }
    const fetchFn = fetchReturning(index()) as unknown as typeof fetch

    const sources = await loadSources({
      registryUrls: [registryA],
      localCards: [JSON.stringify(card)],
      network: 'mutinynet',
      fetchFn,
      now,
    })

    expect(sources[1]).toMatchObject({ source: 'local:pinned-solver', userAdded: true, ok: true })
    const merged = mergeMarkets(sources, BTC_USDT_ID_PAIR)
    expect(merged[0]).toMatchObject({ solver: 'pinned-solver', fee_bps: 5, userAdded: true })
    expect(merged[1]).toMatchObject({ solver: 'arklabs-solver', fee_bps: 30, userAdded: false })
  })

  it('rejects an invalid local card with the schema error, without failing the registries', async () => {
    const badCard = { version: 0, name: 'bad', markets: [{ pair: 'BTC' }] }
    const fetchFn = fetchReturning(index()) as unknown as typeof fetch

    const sources = await loadSources({
      registryUrls: [registryA],
      localCards: [badCard as Record<string, unknown>],
      network: 'mutinynet',
      fetchFn,
      now,
    })

    expect(sources[0].ok).toBe(true)
    expect(sources[1].ok).toBe(false)
    expect(sources[1].error).toBeInstanceOf(DiscoveryValidationError)
    expect(sources[1].error?.message).toMatch(/base_asset/)
  })
})

describe('indexUrl', () => {
  it('builds <base-url>/<network>.json, trimming trailing slashes', () => {
    expect(indexUrl('https://r.example.com', 'mainnet')).toBe('https://r.example.com/mainnet.json')
    expect(indexUrl('https://r.example.com//', 'mutinynet')).toBe('https://r.example.com/mutinynet.json')
  })
})
