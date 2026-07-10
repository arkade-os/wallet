// Consumer side of the Arkade Market Discovery Protocol v0: fetch each
// followed registry's per-network index, merge and rank markets by id pair,
// price from the chosen market's pinned feed, and compute the wantAmount.
// Wire field names mirror the registry JSON exactly (snake_case).

export const DEFAULT_SAFETY_BPS = 50
export const INDEX_TTL_MS = 10 * 60 * 1000
export const STALE_AFTER_SECONDS = 7 * 24 * 60 * 60
const FEED_TTL_MS = 30 * 1000
const BPS = BigInt(10000)

// --- errors -------------------------------------------------------------

export type DiscoveryErrorCode =
  | 'validation' // index/market failed schema validation (incl. network mismatch)
  | 'no-market' // no followed source lists this id pair
  | 'size' // markets exist but none accepts this trade size
  | 'feed' // the market's price feed is unreachable or unparseable
  | 'sources' // every followed registry failed to load

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode
  /** Set when a feed fetch was blocked by the browser (likely CORS). */
  readonly maybeCors: boolean

  constructor(code: DiscoveryErrorCode, message: string, opts: { maybeCors?: boolean } = {}) {
    super(message)
    this.name = 'DiscoveryError'
    this.code = code
    this.maybeCors = opts.maybeCors ?? false
  }
}

function fail(message: string): never {
  throw new DiscoveryError('validation', message)
}

// --- wire types ----------------------------------------------------------

/**
 * Per-side asset descriptor. `id` is the canonical identity (`btc` or the
 * asset id in lowercase hex); `name`/`ticker` are unverified labels and
 * `precision` is display-only. Clients group, dedupe, and price by `id` alone.
 */
export interface AssetDescriptor {
  id: string
  name: string
  ticker: string
  precision: number
}

/** One market entry of a reduced per-network index. */
export interface IndexMarket {
  /** Human-readable `<base-ticker>/<quote-ticker>` label. Display only — NOT an identity. */
  pair: string
  solver: string
  discovery_pubkey?: string
  base_asset: AssetDescriptor
  quote_asset: AssetDescriptor
  price_feed: string
  price_decimals: number
  invert: boolean
  fee_bps: number
  /** Trade size bounds in base-asset units, regardless of direction. */
  min_base_amount: number
  max_base_amount: number
}

/** The reduced per-network index a registry publishes (`<base-url>/<network>.json`). */
export interface DiscoveryIndex {
  version: 0
  network: string
  generated_at: number
  commit: string
  markets: IndexMarket[]
}

export interface Staleness {
  ageSeconds: number
  stale: boolean
}

/** Outcome of loading one registry, isolated from its siblings. */
export interface SourceResult {
  source: string
  ok: boolean
  error?: Error
  markets: IndexMarket[]
  staleness?: Staleness
}

/** A market in the merged, ranked cross-registry view, tagged with its source. */
export interface Market extends IndexMarket {
  source: string
}

// --- pricing (pure, bigint only — no floats near amounts) -----------------

/** A price in quote-units-per-base-unit, kept as an exact rational. */
export interface Price {
  num: bigint
  den: bigint
}

/** `base-to-quote`: deposit base, want quote (uses P). `quote-to-base`: the reverse (uses 1/P). */
export type SwapDirection = 'base-to-quote' | 'quote-to-base'

const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/

/**
 * Normalize a raw feed observation to quote-units-per-base-unit using the
 * market's `invert` and `price_decimals` (spec: maker flow step 4). The raw
 * value divided by 10^price_decimals is the feed's price; `invert` flips it.
 */
export function feedPrice(observation: string | number, market: { price_decimals: number; invert: boolean }): Price {
  const match = DECIMAL.exec(String(observation).trim())
  if (!match) fail(`not a decimal number: "${observation}"`)
  const [, sign, integer, fraction = '', exponent = '0'] = match
  let mantissa = BigInt(`${sign}${integer}${fraction}`)
  let scale = fraction.length - Number(exponent)
  if (scale < 0) {
    mantissa *= BigInt(10) ** BigInt(-scale)
    scale = 0
  }
  if (mantissa <= BigInt(0)) fail(`feed observation must be a positive number, got "${observation}"`)
  const den = BigInt(10) ** BigInt(scale + market.price_decimals)
  return market.invert ? { num: den, den: mantissa } : { num: mantissa, den }
}

/**
 * Spec formula: `wantAmount = floor(D * P * (1 - (fee_bps + safety_bps) / 10000))`,
 * symmetric with 1/P for the reverse direction. `depositAmount` is in the
 * deposit-side asset's smallest units; the result is in the opposite side's.
 */
export function computeWantAmount({
  depositAmount,
  price,
  feeBps,
  safetyBps = DEFAULT_SAFETY_BPS,
  direction,
}: {
  depositAmount: bigint
  price: Price
  feeBps: number
  safetyBps?: number
  direction: SwapDirection
}): bigint {
  if (depositAmount <= BigInt(0)) fail(`depositAmount must be positive, got ${depositAmount}`)
  if (![feeBps, safetyBps].every((bps) => Number.isInteger(bps) && bps >= 0)) {
    fail(`feeBps/safetyBps must be non-negative integers, got ${feeBps}/${safetyBps}`)
  }
  const total = BigInt(feeBps + safetyBps)
  if (total >= BPS) fail(`feeBps + safetyBps must be below 10000, got ${total}`)
  const keep = BPS - total
  // bigint division truncates; every operand is positive, so this is floor().
  return direction === 'base-to-quote'
    ? (depositAmount * price.num * keep) / (price.den * BPS)
    : (depositAmount * price.den * keep) / (price.num * BPS)
}

// --- index validation ------------------------------------------------------
// Typed parse: unknown fields are rejected loudly (path + key), order is free.

const ASSET_ID = /^(btc|[0-9a-fA-F]{8,})$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function checkKeys(obj: Record<string, unknown>, path: string, known: string[]): void {
  for (const key of Object.keys(obj)) {
    if (!known.includes(key)) fail(`${path}: unknown field "${key}"`)
  }
}

function str(obj: Record<string, unknown>, path: string, key: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || !value) fail(`${path}.${key}: expected a non-empty string`)
  return value
}

function uint(obj: Record<string, unknown>, path: string, key: string): number {
  const value = obj[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail(`${path}.${key}: expected a non-negative integer`)
  }
  return value
}

function parseAsset(value: unknown, path: string): AssetDescriptor {
  if (!isRecord(value)) fail(`${path}: expected an object`)
  checkKeys(value, path, ['id', 'name', 'ticker', 'precision'])
  const id = str(value, path, 'id')
  if (!ASSET_ID.test(id)) fail(`${path}.id: malformed asset id "${id}"`)
  return {
    id: id.toLowerCase(),
    name: str(value, path, 'name'),
    ticker: str(value, path, 'ticker'),
    precision: uint(value, path, 'precision'),
  }
}

function parseMarket(value: unknown, path: string): IndexMarket {
  if (!isRecord(value)) fail(`${path}: expected an object`)
  checkKeys(value, path, [
    'pair',
    'solver',
    'discovery_pubkey',
    'base_asset',
    'quote_asset',
    'price_feed',
    'price_decimals',
    'invert',
    'fee_bps',
    'min_base_amount',
    'max_base_amount',
  ])
  const base_asset = parseAsset(value.base_asset, `${path}.base_asset`)
  const quote_asset = parseAsset(value.quote_asset, `${path}.quote_asset`)
  if (base_asset.id === quote_asset.id) fail(`${path}: base_asset.id and quote_asset.id must differ`)
  // Display-only label, but a label disagreeing with its asset objects is a
  // malformed entry — the registry reducer enforces the same equality.
  const pair = str(value, path, 'pair')
  if (pair !== `${base_asset.ticker}/${quote_asset.ticker}`) {
    fail(`${path}.pair: label "${pair}" does not match asset tickers "${base_asset.ticker}/${quote_asset.ticker}"`)
  }
  const price_feed = str(value, path, 'price_feed')
  if (!/^https?:\/\//.test(price_feed)) fail(`${path}.price_feed: expected an http(s) URL`)
  if (typeof value.invert !== 'boolean') fail(`${path}.invert: expected a boolean`)
  const fee_bps = uint(value, path, 'fee_bps')
  if (fee_bps >= 10000) fail(`${path}.fee_bps: must be below 10000`)
  const min_base_amount = uint(value, path, 'min_base_amount')
  const max_base_amount = uint(value, path, 'max_base_amount')
  if (min_base_amount > max_base_amount) fail(`${path}: min_base_amount exceeds max_base_amount`)
  const discovery_pubkey = value.discovery_pubkey
  if (
    discovery_pubkey !== undefined &&
    (typeof discovery_pubkey !== 'string' || !/^[0-9a-f]{64}$/.test(discovery_pubkey))
  ) {
    fail(`${path}.discovery_pubkey: expected 64 lowercase hex chars`)
  }
  return {
    pair,
    solver: str(value, path, 'solver'),
    discovery_pubkey,
    base_asset,
    quote_asset,
    price_feed,
    price_decimals: uint(value, path, 'price_decimals'),
    invert: value.invert,
    fee_bps,
    min_base_amount,
    max_base_amount,
  }
}

/** Typed parse of a reduced per-network index. Throws DiscoveryError('validation'). */
export function parseIndex(json: unknown, path = 'index'): DiscoveryIndex {
  if (!isRecord(json)) fail(`${path}: expected an object`)
  checkKeys(json, path, ['version', 'network', 'generated_at', 'commit', 'markets'])
  if (json.version !== 0) fail(`${path}: unknown version ${JSON.stringify(json.version)}, expected 0`)
  if (!Array.isArray(json.markets)) fail(`${path}.markets: expected an array`)
  return {
    version: 0,
    network: str(json, path, 'network'),
    generated_at: uint(json, path, 'generated_at'),
    commit: str(json, path, 'commit'),
    markets: json.markets.map((entry, i) => parseMarket(entry, `${path}.markets[${i}]`)),
  }
}

// --- registry client --------------------------------------------------------

export interface FetchOptions {
  ttlMs?: number
  fetchFn?: typeof fetch
  now?: () => number
}

const indexCache = new Map<string, { fetchedAt: number; index: DiscoveryIndex }>()
const feedCache = new Map<string, { fetchedAt: number; value: string }>()

export function clearDiscoveryCaches(): void {
  indexCache.clear()
  feedCache.clear()
}

/** `<base-url>/<network>.json` — the one artifact a registry publishes per network. */
export const indexUrl = (baseUrl: string, network: string): string => `${baseUrl.replace(/\/+$/, '')}/${network}.json`

/**
 * Fetch one registry's per-network index, TTL-cached (default 10 minutes).
 * A wallet on one network must never price from another's index, so a
 * `network` mismatch fails loudly.
 */
export async function fetchIndex(
  baseUrl: string,
  expectedNetwork: string,
  opts: FetchOptions = {},
): Promise<DiscoveryIndex> {
  const { ttlMs = INDEX_TTL_MS, fetchFn = fetch, now = Date.now } = opts
  const url = indexUrl(baseUrl, expectedNetwork)
  const cached = indexCache.get(url)
  if (cached && now() - cached.fetchedAt < ttlMs) return cached.index

  const response = await fetchFn(url)
  if (!response.ok) throw new Error(`registry ${url} responded with HTTP ${response.status}`)
  const index = parseIndex(await response.json(), url)
  if (index.network !== expectedNetwork) {
    fail(`discovery index network mismatch: expected "${expectedNetwork}", got "${index.network}"`)
  }
  indexCache.set(url, { fetchedAt: now(), index })
  return index
}

/** Age of an index from its CI-stamped `generated_at` (staleness threshold: 7 days). */
export function staleness(
  index: Pick<DiscoveryIndex, 'generated_at'>,
  opts: { thresholdSeconds?: number; now?: () => number } = {},
): Staleness {
  const { thresholdSeconds = STALE_AFTER_SECONDS, now = Date.now } = opts
  const ageSeconds = Math.max(0, Math.floor(now() / 1000 - index.generated_at))
  return { ageSeconds, stale: ageSeconds > thresholdSeconds }
}

export interface LoadSourcesParams extends FetchOptions {
  registryUrls: string[]
  network: string
}

/**
 * Load all followed registries in parallel with per-source error isolation:
 * one dead or invalid registry never blocks the others. Result order follows
 * `registryUrls` — that order is the merge tiebreak.
 */
export function loadSources({ registryUrls, network, ...opts }: LoadSourcesParams): Promise<SourceResult[]> {
  return Promise.all(
    registryUrls.map(
      (baseUrl): Promise<SourceResult> =>
        fetchIndex(baseUrl, network, opts).then(
          (index) => ({ source: baseUrl, ok: true, markets: index.markets, staleness: staleness(index, opts) }),
          (error) => ({ source: baseUrl, ok: false, error: error as Error, markets: [] }),
        ),
    ),
  )
}

/** A market's identity: `<base_asset.id>/<quote_asset.id>`. The ticker label never identifies. */
export const marketIdPair = (market: Pick<IndexMarket, 'base_asset' | 'quote_asset'>): string =>
  `${market.base_asset.id}/${market.quote_asset.id}`

/**
 * Union of all markets across sources for an id pair, tagged with their
 * source. Byte-identical duplicates (the same solver listed in two
 * registries) are dropped; name collisions across registries stay distinct —
 * `name` is only unique within one registry. Ranked ascending by `fee_bps`,
 * source order as tiebreak (stable sort).
 */
export function mergeMarkets(sources: SourceResult[], idPair: string): Market[] {
  const wanted = idPair.toLowerCase()
  const seen = new Set<string>()
  const merged: Market[] = []
  for (const { ok, source, markets } of sources) {
    if (!ok) continue
    for (const market of markets) {
      if (marketIdPair(market) !== wanted) continue
      // parseMarket constructs every market with the same key order, so plain
      // stringification is a canonical byte-identity across registries.
      const key = JSON.stringify(market)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ ...market, source })
    }
  }
  return merged.sort((a, b) => a.fee_bps - b.fee_bps)
}

// --- feed + quote facade ------------------------------------------------------

const NUMERIC = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/

/** Pull a price out of a feed body: bare number, JSON number/string, or a common wrapper key. */
export function extractFeedValue(body: string): string | undefined {
  let value: unknown = body.trim()
  try {
    value = JSON.parse(body)
  } catch {
    // not JSON — keep the raw trimmed body
  }
  if (isRecord(value)) {
    const record = value
    value = ['price', 'rate', 'last', 'value', 'result'].map((key) => record[key]).find((v) => v !== undefined)
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && NUMERIC.test(value.trim())) return value.trim()
  return undefined
}

async function fetchFeedObservation(url: string, opts: FetchOptions): Promise<string> {
  const { fetchFn = fetch, now = Date.now } = opts
  const cached = feedCache.get(url)
  if (cached && now() - cached.fetchedAt < FEED_TTL_MS) return cached.value

  let response: Response
  try {
    response = await fetchFn(url)
  } catch (error) {
    // In browsers a CORS-blocked request rejects with an opaque TypeError —
    // the strongest available signal that the feed is not browser-fetchable.
    const maybeCors = error instanceof TypeError
    throw new DiscoveryError(
      'feed',
      `price feed ${url} is ${maybeCors ? 'blocked by the browser (possibly CORS)' : 'unreachable'}`,
      { maybeCors },
    )
  }
  if (!response.ok) throw new DiscoveryError('feed', `price feed ${url} responded with HTTP ${response.status}`)
  const value = extractFeedValue(await response.text())
  if (value === undefined) throw new DiscoveryError('feed', `could not parse a price from feed ${url}`)
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
  market: Market
  solver: string
  source: string
  /** Staleness of the winning market's source index. */
  staleness?: Staleness
}

/**
 * The one call a wallet UI needs: load all sources, merge and rank markets
 * for the id pair, walk the ranking pricing each market from its own pinned
 * feed (a failing feed falls through to the next market), and compute the
 * wantAmount. Size bounds are base-denominated per spec: the deposit when
 * depositing base, the wantAmount when wanting base.
 */
export async function quoteOffer(params: QuoteOfferParams): Promise<QuoteOfferResult> {
  const { pair, depositAmount, direction, safetyBps, ...sourceParams } = params

  const sources = await loadSources(sourceParams)
  if (sources.length > 0 && sources.every((s) => !s.ok)) {
    const reasons = sources.map((s) => s.error?.message).join('; ')
    throw new DiscoveryError('sources', `all ${sources.length} discovery source(s) failed: ${reasons}`)
  }
  const markets = mergeMarkets(sources, pair)
  if (markets.length === 0) throw new DiscoveryError('no-market', `no market found for pair ${pair}`)

  let feedError: DiscoveryError | undefined
  let sizeRejected = false
  for (const market of markets) {
    const min = BigInt(market.min_base_amount)
    const max = BigInt(market.max_base_amount)
    if (direction === 'base-to-quote' && (depositAmount < min || depositAmount > max)) {
      sizeRejected = true
      continue
    }
    let observation: string
    try {
      observation = await fetchFeedObservation(market.price_feed, sourceParams)
    } catch (error) {
      feedError ??= error as DiscoveryError
      continue // feed failure falls through to the next market in the ranking
    }
    const price = feedPrice(observation, market)
    const wantAmount = computeWantAmount({ depositAmount, price, feeBps: market.fee_bps, safetyBps, direction })
    if (direction === 'quote-to-base' && (wantAmount < min || wantAmount > max)) {
      sizeRejected = true // wanting base: the base side of this trade is the wantAmount
      continue
    }
    return {
      wantAmount,
      price,
      market,
      solver: market.solver,
      source: market.source,
      staleness: sources.find((s) => s.source === market.source)?.staleness,
    }
  }

  if (feedError) throw feedError
  throw sizeRejected
    ? new DiscoveryError('size', `no market for pair ${pair} accepts this trade size`)
    : new DiscoveryError('no-market', `no market found for pair ${pair}`)
}
