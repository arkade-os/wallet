// The one call a wallet UI needs: pick the best viable market across all
// followed registries and pinned cards, price it from the market's own feed,
// and compute the wantAmount for the existing offer flow. Discovery only
// decides *which* market and *what* wantAmount — funding runs unchanged.

import { AllSourcesFailedError, FeedParseError, FeedUnreachableError, MarketSizeError, NoMarketError } from './errors'
import { loadSources, LoadSourcesParams, mergeMarkets } from './index-client'
import { computeWantAmount, feedPrice, Price, priceToDecimalString, SwapDirection } from './pricing'
import { DEFAULT_SAFETY_BPS, Market, SourceResult, Staleness } from './types'

export * from './errors'
export * from './index-client'
export * from './pricing'
export * from './types'

const FEED_TTL_MS = 30 * 1000

const feedCache = new Map<string, { fetchedAt: number; value: string }>()

export function clearFeedCache(): void {
  feedCache.clear()
}

/** Pull a numeric price out of a feed body: bare number, JSON number/string, or common wrapper keys. */
export function extractFeedValue(body: string): string | undefined {
  const trimmed = body.trim()
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return undefined
  }
  return extractFromJson(parsed, 0)
}

const FEED_VALUE_KEYS = ['price', 'rate', 'last', 'value', 'result', 'amount']

function extractFromJson(value: unknown, depth: number): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) return value.trim()
  if (depth >= 2 || typeof value !== 'object' || value === null) return undefined
  if (Array.isArray(value)) return value.length === 1 ? extractFromJson(value[0], depth + 1) : undefined
  const record = value as Record<string, unknown>
  for (const key of [...FEED_VALUE_KEYS, 'data']) {
    if (key in record) {
      const extracted = extractFromJson(record[key], depth + 1)
      if (extracted !== undefined) return extracted
    }
  }
  return undefined
}

/**
 * Fetch a market's price feed and extract the raw observation as a decimal
 * string. Throws FeedUnreachableError (with a CORS hint when the browser
 * blocks the request) or FeedParseError — both distinct so UIs can explain
 * why a pair is unpriceable.
 */
export async function fetchFeedObservation(
  url: string,
  opts: { fetchFn?: typeof fetch; now?: () => number; ttlMs?: number } = {},
): Promise<string> {
  const { fetchFn = fetch, now = Date.now, ttlMs = FEED_TTL_MS } = opts

  const cached = feedCache.get(url)
  if (cached && now() - cached.fetchedAt < ttlMs) return cached.value

  let response: Response
  try {
    response = await fetchFn(url)
  } catch (error) {
    // In browsers a CORS-blocked request rejects with an opaque TypeError and
    // no status — the strongest signal available that the feed is not
    // browser-fetchable from this origin.
    throw new FeedUnreachableError(url, { maybeCors: error instanceof TypeError, cause: error })
  }
  if (!response.ok) throw new FeedUnreachableError(url, { status: response.status })

  const body = await response.text()
  const value = extractFeedValue(body)
  if (value === undefined) throw new FeedParseError(url, `unrecognized body ${JSON.stringify(body.slice(0, 120))}`)

  feedCache.set(url, { fetchedAt: now(), value })
  return value
}

export interface QuoteOfferParams extends LoadSourcesParams {
  /** Id pair to trade: `<base_asset.id>/<quote_asset.id>` (`btc` or lowercase hex — never tickers). */
  pair: string
  /** Deposit amount in the deposit-side asset's smallest units. */
  depositAmount: bigint
  direction: SwapDirection
  safetyBps?: number
}

export interface QuoteOfferResult {
  wantAmount: bigint
  /** Exact price used, quote-units-per-base-unit. */
  price: Price
  /** Display-only decimal rendering of `price`. */
  priceString: string
  /** The raw feed observation the price was derived from. */
  observation: string
  market: Market
  solver: string
  /** Which registry (or local card) the winning market came from. */
  source: string
  userAdded: boolean
  /** Staleness of the winning market's source index (absent for local cards). */
  staleness?: Staleness
  /** Per-source status so the UI can attribute markets and warn on stale/dead sources. */
  sources: SourceResult[]
}

/**
 * Load all sources, merge and rank markets for the pair and size, then walk
 * the ranking: fetch each market's pinned feed, normalize, and compute the
 * wantAmount. A market whose feed fails falls through to the next one.
 *
 * Size bounds are base-denominated per spec: for `base-to-quote` the deposit
 * is the base amount and filters up front; for `quote-to-base` the bound
 * applies to the wantAmount, which is only known after pricing.
 */
export async function quoteOffer(params: QuoteOfferParams): Promise<QuoteOfferResult> {
  const { pair, depositAmount, direction, safetyBps = DEFAULT_SAFETY_BPS, ...sourceParams } = params

  const sources = await loadSources(sourceParams)
  const failed = sources.filter((source) => !source.ok)
  if (sources.length > 0 && failed.length === sources.length) {
    throw new AllSourcesFailedError(failed.map((source) => source.error ?? new Error(source.source)))
  }

  const forPair = mergeMarkets(sources, pair)
  if (forPair.length === 0) throw new NoMarketError(pair)

  const sized = direction === 'base-to-quote' ? mergeMarkets(sources, pair, depositAmount) : forPair
  if (sized.length === 0) throw new MarketSizeError(pair, depositAmount)

  let firstFeedError: Error | undefined
  let sawSizeReject = false

  for (const market of sized) {
    let observation: string
    try {
      observation = await fetchFeedObservation(market.price_feed, sourceParams)
    } catch (error) {
      firstFeedError ??= error instanceof Error ? error : new Error(String(error))
      continue // feed failure falls through to the next market in the ranking
    }

    const price = feedPrice(observation, market)
    const wantAmount = computeWantAmount({ depositAmount, price, feeBps: market.fee_bps, safetyBps, direction })

    if (direction === 'quote-to-base') {
      // Wanting base: the base side of this trade is the wantAmount itself.
      if (wantAmount < BigInt(market.min_base_amount) || wantAmount > BigInt(market.max_base_amount)) {
        sawSizeReject = true
        continue
      }
    }

    const sourceResult = sources.find((s) => s.source === market.source)
    return {
      wantAmount,
      price,
      priceString: priceToDecimalString(price),
      observation,
      market,
      solver: market.solver,
      source: market.source,
      userAdded: market.userAdded,
      staleness: sourceResult?.staleness,
      sources,
    }
  }

  if (firstFeedError) throw firstFeedError
  if (sawSizeReject) throw new MarketSizeError(pair, depositAmount)
  throw new NoMarketError(pair)
}
