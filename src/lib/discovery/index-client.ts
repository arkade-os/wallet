// Multi-registry consumer for the Arkade Market Discovery Protocol v0.
// Clients follow a SET of registries plus user-pinned solver cards; no single
// registry is a dependency and one dead registry never blocks the others.

import { DiscoveryValidationError, NetworkMismatchError } from './errors'
import {
  AssetDescriptor,
  CardMarket,
  DISCOVERY_VERSION,
  DiscoveryIndex,
  IndexMarket,
  Market,
  SolverCard,
  SourceResult,
  Staleness,
} from './types'

export const INDEX_TTL_MS = 10 * 60 * 1000
export const STALE_AFTER_SECONDS = 7 * 24 * 60 * 60

export interface FetchOptions {
  ttlMs?: number
  fetchFn?: typeof fetch
  now?: () => number
}

const indexCache = new Map<string, { fetchedAt: number; index: DiscoveryIndex }>()

export function clearIndexCache(): void {
  indexCache.clear()
}

/** `<base-url>/<network>.json` — the one artifact a registry publishes per network. */
export function indexUrl(baseUrl: string, network: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${network}.json`
}

// --- schema validation ------------------------------------------------------
// Typed parse: unknown fields are rejected loudly enough to debug (path + key),
// key order is irrelevant. Kept dependency-free on purpose.

const ASSET_ID = /^(btc|[0-9a-fA-F]{8,})$/

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DiscoveryValidationError(`${path}: expected an object`)
  }
  return value as Record<string, unknown>
}

function rejectUnknownFields(obj: Record<string, unknown>, path: string, known: string[]): void {
  for (const key of Object.keys(obj)) {
    if (!known.includes(key)) throw new DiscoveryValidationError(`${path}: unknown field "${key}"`)
  }
}

function requireVersion(obj: Record<string, unknown>, path: string): void {
  if (obj.version !== DISCOVERY_VERSION) {
    throw new DiscoveryValidationError(`${path}: unknown version ${JSON.stringify(obj.version)}, expected 0`)
  }
}

function requireString(obj: Record<string, unknown>, path: string, key: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new DiscoveryValidationError(`${path}.${key}: expected a non-empty string`)
  }
  return value
}

function requireAmount(obj: Record<string, unknown>, path: string, key: string): number {
  const value = obj[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new DiscoveryValidationError(`${path}.${key}: expected a non-negative integer`)
  }
  return value
}

/**
 * A market's identity: the id pair `<base_asset.id>/<quote_asset.id>`.
 * The `pair` ticker label is display only and never a grouping key —
 * tickers collide, ids don't.
 */
export function marketIdPair(market: Pick<CardMarket, 'base_asset' | 'quote_asset'>): string {
  return `${market.base_asset.id}/${market.quote_asset.id}`
}

/** Canonical id form: `btc` or the asset id in lowercase hex. */
export const normalizeAssetId = (id: string): string => id.toLowerCase()

/** Canonical id-pair form (both sides lowercased). */
export function normalizeIdPair(idPair: string): string {
  return idPair.split('/').map(normalizeAssetId).join('/')
}

function parseAssetDescriptor(value: unknown, path: string): AssetDescriptor {
  const obj = requireRecord(value, path)
  rejectUnknownFields(obj, path, ['id', 'name', 'ticker', 'precision'])
  const id = requireString(obj, path, 'id')
  if (!ASSET_ID.test(id)) throw new DiscoveryValidationError(`${path}.id: malformed asset id "${id}"`)
  const precision = requireAmount(obj, path, 'precision')
  if (precision > 36) throw new DiscoveryValidationError(`${path}.precision: out of range`)
  return {
    id: normalizeAssetId(id),
    name: requireString(obj, path, 'name'),
    ticker: requireString(obj, path, 'ticker'),
    precision,
  }
}

function parseMarketFields(value: unknown, path: string, extraKnown: string[]): CardMarket & Record<string, unknown> {
  const obj = requireRecord(value, path)
  rejectUnknownFields(obj, path, [
    'pair',
    'base_asset',
    'quote_asset',
    'price_feed',
    'price_decimals',
    'invert',
    'fee_bps',
    'min_base_amount',
    'max_base_amount',
    ...extraKnown,
  ])

  const baseAsset = parseAssetDescriptor(obj.base_asset, `${path}.base_asset`)
  const quoteAsset = parseAssetDescriptor(obj.quote_asset, `${path}.quote_asset`)
  if (baseAsset.id === quoteAsset.id) {
    throw new DiscoveryValidationError(`${path}: base_asset.id and quote_asset.id must differ`)
  }

  // The pair label is display only, but a label disagreeing with its asset
  // objects is a malformed card — CI enforces the same equality.
  const pair = requireString(obj, path, 'pair')
  if (pair !== `${baseAsset.ticker}/${quoteAsset.ticker}`) {
    throw new DiscoveryValidationError(
      `${path}.pair: label "${pair}" does not match asset tickers "${baseAsset.ticker}/${quoteAsset.ticker}"`,
    )
  }

  const priceFeed = requireString(obj, path, 'price_feed')
  if (!/^https?:\/\//.test(priceFeed)) {
    throw new DiscoveryValidationError(`${path}.price_feed: expected an http(s) URL`)
  }

  const priceDecimals = requireAmount(obj, path, 'price_decimals')
  if (priceDecimals > 36) throw new DiscoveryValidationError(`${path}.price_decimals: out of range`)

  if (typeof obj.invert !== 'boolean') {
    throw new DiscoveryValidationError(`${path}.invert: expected a boolean`)
  }

  const feeBps = requireAmount(obj, path, 'fee_bps')
  if (feeBps >= 10000) throw new DiscoveryValidationError(`${path}.fee_bps: must be below 10000`)

  const min = requireAmount(obj, path, 'min_base_amount')
  const max = requireAmount(obj, path, 'max_base_amount')
  if (min > max) throw new DiscoveryValidationError(`${path}: min_base_amount exceeds max_base_amount`)

  return {
    ...obj,
    pair,
    base_asset: baseAsset,
    quote_asset: quoteAsset,
    price_feed: priceFeed,
    price_decimals: priceDecimals,
    invert: obj.invert,
    fee_bps: feeBps,
    min_base_amount: min,
    max_base_amount: max,
  }
}

function optionalHex(obj: Record<string, unknown>, path: string, key: string, length: number): string | undefined {
  const value = obj[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !new RegExp(`^[0-9a-f]{${length}}$`).test(value)) {
    throw new DiscoveryValidationError(`${path}.${key}: expected ${length} lowercase hex chars`)
  }
  return value
}

/** Typed parse of a reduced per-network index. Throws DiscoveryValidationError. */
export function parseIndex(json: unknown, path = 'index'): DiscoveryIndex {
  const obj = requireRecord(json, path)
  rejectUnknownFields(obj, path, ['version', 'network', 'generated_at', 'commit', 'markets'])
  requireVersion(obj, path)
  const network = requireString(obj, path, 'network')
  const generatedAt = requireAmount(obj, path, 'generated_at')
  const commit = requireString(obj, path, 'commit')
  if (!Array.isArray(obj.markets)) throw new DiscoveryValidationError(`${path}.markets: expected an array`)
  const markets = obj.markets.map((entry, i): IndexMarket => {
    const marketPath = `${path}.markets[${i}]`
    const fields = parseMarketFields(entry, marketPath, ['solver', 'discovery_pubkey'])
    return {
      pair: fields.pair,
      solver: requireString(fields, marketPath, 'solver'),
      discovery_pubkey: optionalHex(fields, marketPath, 'discovery_pubkey', 64),
      base_asset: fields.base_asset,
      quote_asset: fields.quote_asset,
      price_feed: fields.price_feed,
      price_decimals: fields.price_decimals,
      invert: fields.invert,
      fee_bps: fields.fee_bps,
      min_base_amount: fields.min_base_amount,
      max_base_amount: fields.max_base_amount,
    }
  })
  return { version: DISCOVERY_VERSION, network, generated_at: generatedAt, commit, markets }
}

/** Typed parse of a single solver card (used for user-pinned local cards). */
export function parseSolverCard(json: unknown, path = 'card'): SolverCard {
  const obj = requireRecord(json, path)
  rejectUnknownFields(obj, path, ['version', 'name', 'discovery_pubkey', 'sig', 'markets'])
  requireVersion(obj, path)
  const name = requireString(obj, path, 'name')
  const discoveryPubkey = optionalHex(obj, path, 'discovery_pubkey', 64)
  const sig = optionalHex(obj, path, 'sig', 128)
  if (sig !== undefined && discoveryPubkey === undefined) {
    throw new DiscoveryValidationError(`${path}: sig requires discovery_pubkey`)
  }
  if (!Array.isArray(obj.markets)) throw new DiscoveryValidationError(`${path}.markets: expected an array`)
  const markets = obj.markets.map((entry, i): CardMarket => {
    const fields = parseMarketFields(entry, `${path}.markets[${i}]`, [])
    return {
      pair: fields.pair,
      base_asset: fields.base_asset,
      quote_asset: fields.quote_asset,
      price_feed: fields.price_feed,
      price_decimals: fields.price_decimals,
      invert: fields.invert,
      fee_bps: fields.fee_bps,
      min_base_amount: fields.min_base_amount,
      max_base_amount: fields.max_base_amount,
    }
  })
  return { version: DISCOVERY_VERSION, name, discovery_pubkey: discoveryPubkey, sig, markets }
}

// --- fetching ----------------------------------------------------------------

/**
 * Fetch one registry's per-network index. A mainnet wallet reading a signet
 * index must fail loudly, not price from it — hence the network check.
 * Responses are TTL-cached in memory (default 10 minutes).
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
  if (index.network !== expectedNetwork) throw new NetworkMismatchError(expectedNetwork, index.network)

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

// --- sources -----------------------------------------------------------------

/** A user-pinned solver card: raw card JSON (object or string) or a URL to one. */
export type LocalCardInput = string | Record<string, unknown>

export interface LoadSourcesParams extends FetchOptions {
  registryUrls: string[]
  localCards?: LocalCardInput[]
  network: string
}

const cardToMarkets = (card: SolverCard): IndexMarket[] =>
  card.markets.map((market) => ({ ...market, solver: card.name, discovery_pubkey: card.discovery_pubkey }))

async function loadLocalCard(input: LocalCardInput, i: number, fetchFn: typeof fetch): Promise<SourceResult> {
  let ref = `local[${i}]`
  try {
    let raw: unknown
    if (typeof input === 'string' && /^https?:\/\//.test(input.trim())) {
      ref = input.trim()
      const response = await fetchFn(ref)
      if (!response.ok) throw new Error(`card ${ref} responded with HTTP ${response.status}`)
      raw = await response.json()
    } else if (typeof input === 'string') {
      raw = JSON.parse(input)
    } else {
      raw = input
    }
    const card = parseSolverCard(raw, ref)
    return {
      source: typeof input === 'string' && ref !== `local[${i}]` ? ref : `local:${card.name}`,
      userAdded: true,
      ok: true,
      markets: cardToMarkets(card),
    }
  } catch (error) {
    return { source: ref, userAdded: true, ok: false, error: asError(error), markets: [] }
  }
}

const asError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)))

/**
 * Load all followed registries plus user-pinned cards in parallel, with
 * per-source error isolation: one dead or invalid source never blocks the
 * others. Registries come first in the result, in the order given (that order
 * is the merge tiebreak).
 */
export async function loadSources(params: LoadSourcesParams): Promise<SourceResult[]> {
  const { registryUrls, localCards = [], network, ...fetchOpts } = params
  const fetchFn = fetchOpts.fetchFn ?? fetch

  const registries = registryUrls.map(
    async (baseUrl): Promise<SourceResult> =>
      fetchIndex(baseUrl, network, fetchOpts)
        .then((index) => ({
          source: baseUrl,
          userAdded: false,
          ok: true as const,
          markets: index.markets,
          staleness: staleness(index, { now: fetchOpts.now }),
        }))
        .catch((error) => ({ source: baseUrl, userAdded: false, ok: false, error: asError(error), markets: [] })),
  )
  const locals = localCards.map((input, i) => loadLocalCard(input, i, fetchFn))
  return Promise.all([...registries, ...locals])
}

// --- merge -------------------------------------------------------------------

const assetKey = (asset: AssetDescriptor): unknown[] => [asset.id, asset.name, asset.ticker, asset.precision]

/** Byte-identical duplicate key: same solver, same market, field order normalized. */
const marketKey = (market: IndexMarket): string =>
  JSON.stringify([
    market.pair,
    market.solver,
    market.discovery_pubkey ?? null,
    assetKey(market.base_asset),
    assetKey(market.quote_asset),
    market.price_feed,
    market.price_decimals,
    market.invert,
    market.fee_bps,
    market.min_base_amount,
    market.max_base_amount,
  ])

/**
 * Union of all markets across sources for an id pair
 * (`<base_asset.id>/<quote_asset.id>` — never the ticker label), each tagged
 * with its source. Byte-identical duplicates (the same solver listed in two
 * registries) are dropped; otherwise entries stay distinct per source —
 * per-registry `name` uniqueness does NOT hold globally, so nothing is ever
 * keyed by name alone. Ranked ascending by `fee_bps`; source order is the
 * tiebreak (stable sort). `baseAmount` (base-asset units) filters by the
 * market's size bounds.
 */
export function mergeMarkets(sources: SourceResult[], idPair: string, baseAmount?: bigint): Market[] {
  const wanted = normalizeIdPair(idPair)
  const seen = new Set<string>()
  const merged: Market[] = []

  for (const source of sources) {
    if (!source.ok) continue
    for (const market of source.markets) {
      if (marketIdPair(market) !== wanted) continue
      if (baseAmount !== undefined) {
        if (baseAmount < BigInt(market.min_base_amount) || baseAmount > BigInt(market.max_base_amount)) continue
      }
      const key = marketKey(market)
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({ ...market, source: source.source, userAdded: source.userAdded })
    }
  }

  return merged.sort((a, b) => a.fee_bps - b.fee_bps)
}
