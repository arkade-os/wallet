import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AllSourcesFailedError,
  clearFeedCache,
  clearIndexCache,
  extractFeedValue,
  FeedUnreachableError,
  MarketSizeError,
  NoMarketError,
  quoteOffer,
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

/** Route fetches by URL: registries serve indexes, feeds serve prices. */
const routedFetch = (routes: Record<string, unknown | (() => never)>) =>
  vi.fn(async (url: string) => {
    for (const [prefix, data] of Object.entries(routes)) {
      if (!url.startsWith(prefix)) continue
      if (typeof data === 'function') return (data as () => never)()
      if (data === undefined) return jsonResponse({}, 500)
      return jsonResponse(data)
    }
    return jsonResponse({}, 404)
  }) as unknown as typeof fetch

beforeEach(() => {
  clearIndexCache()
  clearFeedCache()
})

describe('extractFeedValue', () => {
  it('reads bare numbers, JSON numbers/strings, and common wrapper keys', () => {
    expect(extractFeedValue('65000.12')).toBe('65000.12')
    expect(extractFeedValue('"65000.12"')).toBe('65000.12')
    expect(extractFeedValue('{"price": "65000.12"}')).toBe('65000.12')
    expect(extractFeedValue('{"data": {"rate": 65000.12}}')).toBe('65000.12')
    expect(extractFeedValue('[65000.12]')).toBe('65000.12')
    expect(extractFeedValue('<html>nope</html>')).toBeUndefined()
  })
})

describe('quoteOffer', () => {
  const pair = BTC_USDT_ID_PAIR
  const base = { network: 'mutinynet', pair, depositAmount: BigInt(100000), now }

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
    expect(result.priceString).toBe('65000')
    expect(result.staleness).toEqual({ ageSeconds: 3600, stale: false })
    expect(result.sources).toHaveLength(2)
  })

  it('falls through to the next market when the best feed is down', async () => {
    const cheapDeadFeed = market({ solver: 'cheap', fee_bps: 10, price_feed: 'https://feed.example.com/dead' })
    const backup = market({ solver: 'backup', fee_bps: 30, price_feed: 'https://feed.example.com/alive' })
    const fetchFn = routedFetch({
      [REGISTRY_A]: index({ markets: [cheapDeadFeed, backup] }),
      'https://feed.example.com/dead': undefined, // 500
      'https://feed.example.com/alive': '6500000000000',
    })

    const result = await quoteOffer({ ...base, registryUrls: [REGISTRY_A], direction: 'base-to-quote', fetchFn })

    expect(result.solver).toBe('backup')
  })

  it('reports a browser-blocked (CORS) feed distinctly when no market can price', async () => {
    const only = market({ price_feed: 'https://feed.example.com/cors' })
    const fetchFn = routedFetch({
      [REGISTRY_A]: index({ markets: [only] }),
      'https://feed.example.com/cors': () => {
        throw new TypeError('Failed to fetch')
      },
    })

    const promise = quoteOffer({ ...base, registryUrls: [REGISTRY_A], direction: 'base-to-quote', fetchFn })
    await expect(promise).rejects.toThrow(FeedUnreachableError)
    await promise.catch((error: FeedUnreachableError) => expect(error.maybeCors).toBe(true))
  })

  it('throws MarketSizeError when markets exist but none accepts the size', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index() }) // bounds: 1000..5000000
    await expect(
      quoteOffer({
        ...base,
        depositAmount: BigInt(999),
        registryUrls: [REGISTRY_A],
        direction: 'base-to-quote',
        fetchFn,
      }),
    ).rejects.toThrow(MarketSizeError)
  })

  it('enforces base-denominated bounds on the wantAmount when wanting base', async () => {
    // Wanting base: deposit quote, receive base. P = 65000, so a 1000 quote
    // deposit yields ~0 base units — far below min_base_amount.
    const fetchFn = routedFetch({
      [REGISTRY_A]: index(),
      'https://feed.example.com/btcusdt': '6500000000000',
    })
    await expect(
      quoteOffer({
        ...base,
        depositAmount: BigInt(1000),
        registryUrls: [REGISTRY_A],
        direction: 'quote-to-base',
        fetchFn,
      }),
    ).rejects.toThrow(MarketSizeError)
  })

  it('throws NoMarketError when no source lists the id pair', async () => {
    const fetchFn = routedFetch({ [REGISTRY_A]: index() })
    await expect(
      quoteOffer({
        ...base,
        pair: `${DEPIX_ID}/btc`,
        registryUrls: [REGISTRY_A],
        direction: 'base-to-quote',
        fetchFn,
      }),
    ).rejects.toThrow(NoMarketError)
  })

  it('throws AllSourcesFailedError when every registry and card fails', async () => {
    const fetchFn = routedFetch({}) // everything 404s
    await expect(
      quoteOffer({
        ...base,
        registryUrls: [REGISTRY_A, REGISTRY_B],
        localCards: ['{not json'],
        direction: 'base-to-quote',
        fetchFn,
      }),
    ).rejects.toThrow(AllSourcesFailedError)
  })

  it('prices from a local card alone, with an empty registry list', async () => {
    const card = {
      version: 0,
      name: 'pinned',
      markets: [
        {
          pair: 'BTC/USDT',
          base_asset: btcAsset,
          quote_asset: usdtAsset,
          price_feed: 'https://feed.example.com/pinned',
          price_decimals: 8,
          invert: false,
          fee_bps: 0,
          min_base_amount: 1,
          max_base_amount: 100000000,
        },
      ],
    }
    const fetchFn = routedFetch({ 'https://feed.example.com/pinned': '6500000000000' })

    const result = await quoteOffer({
      ...base,
      registryUrls: [],
      localCards: [card as Record<string, unknown>],
      direction: 'base-to-quote',
      safetyBps: 0,
      fetchFn,
    })

    expect(result.userAdded).toBe(true)
    expect(result.source).toBe('local:pinned')
    expect(result.wantAmount).toBe(BigInt(100000) * BigInt(65000))
  })
})

describe('wallet adapter', () => {
  it('maps wallet asset ids onto discovery asset ids (same id, canonical case)', () => {
    expect(assetPairId('btc')).toBe('btc')
    expect(assetPairId(DEPIX_ID)).toBe(DEPIX_ID)
    expect(assetPairId(DEPIX_ID.toUpperCase())).toBe(DEPIX_ID)
    expect(assetPairId('account:usd')).toBeUndefined()
    expect(assetPairId('swap-empty')).toBeUndefined()
  })

  it('maps wallet network names onto registry partitions', () => {
    expect(discoveryNetwork('bitcoin')).toBe('mainnet')
    expect(discoveryNetwork('mutinynet')).toBe('mutinynet')
    expect(discoveryNetwork('signet')).toBe('signet')
    expect(discoveryNetwork('')).toBeUndefined()
    expect(discoveryNetwork('testnet')).toBeUndefined()
  })

  it('quotes DePix -> BTC through a market listed with DePix as base (base-to-quote)', async () => {
    const depix = depixMarket({ price_decimals: 0, fee_bps: 0, min_base_amount: 1, max_base_amount: 100000000 })
    const fetchFn = routedFetch({
      [REGISTRY_A]: index({ markets: [depix] }),
      'https://feed.example.com/depix': '2',
    })

    const result = await quoteSwap({
      fromAssetId: DEPIX_ID,
      toAssetId: 'btc',
      depositAmount: BigInt(10000),
      network: 'mutinynet',
      registryUrls: [REGISTRY_A],
      safetyBps: 50,
      fetchFn,
      now,
    })

    expect(result.direction).toBe('base-to-quote')
    expect(result.pair).toBe(`${DEPIX_ID}/btc`)
    expect(result.market.pair).toBe('DEPIX/BTC')
    // floor(10000 * 2 * (1 - 50/10000))
    expect(result.wantAmount).toBe(BigInt(19900))
  })

  it('quotes BTC -> DePix through the same market (quote-to-base, symmetric with 1/P)', async () => {
    const depix = depixMarket({ price_decimals: 0, fee_bps: 0, min_base_amount: 1, max_base_amount: 100000000 })
    const fetchFn = routedFetch({
      [REGISTRY_A]: index({ markets: [depix] }),
      'https://feed.example.com/depix': '2',
    })

    const result = await quoteSwap({
      fromAssetId: 'btc',
      toAssetId: DEPIX_ID,
      depositAmount: BigInt(19900),
      network: 'mutinynet',
      registryUrls: [REGISTRY_A],
      safetyBps: 0,
      fetchFn,
      now,
    })

    expect(result.direction).toBe('quote-to-base')
    expect(result.pair).toBe(`${DEPIX_ID}/btc`)
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
    ).rejects.toThrow(NoMarketError)
  })
})
