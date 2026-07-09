// Wire types for the Arkade Market Discovery Protocol v0.
// Field names mirror the registry JSON exactly (snake_case) — do not rename.

export const DISCOVERY_VERSION = 0

/** Suggested client default for the pricing safety cushion (spec §Maker pricing). */
export const DEFAULT_SAFETY_BPS = 50

/**
 * Per-side asset descriptor. `id` is the canonical identity — `btc` or the
 * serialized AssetId in lowercase hex; `name`/`ticker` are unverified labels
 * the solver chose (anyone can call an asset "USDT"), and `precision` is for
 * rendering amounts only. Clients group, dedupe, and price by `id` alone.
 */
export interface AssetDescriptor {
  id: string
  name: string
  ticker: string
  /** Decimal places of the atomic unit (e.g. 8 for BTC ⇒ amounts in sats). Display only. */
  precision: number
}

/** One market as declared in a solver card (no solver attribution yet). */
export interface CardMarket {
  /** Human-readable label `<base-ticker>/<quote-ticker>`. Display only — NOT an identity. */
  pair: string
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

/** A solver card: `solvers/<network>/<name>.json` in a registry repo. */
export interface SolverCard {
  version: typeof DISCOVERY_VERSION
  name: string
  discovery_pubkey?: string
  sig?: string
  markets: CardMarket[]
}

/** One market entry of a reduced per-network index (card market + solver attribution). */
export interface IndexMarket extends CardMarket {
  solver: string
  discovery_pubkey?: string
}

/** The reduced per-network index published by a registry (`<base-url>/<network>.json`). */
export interface DiscoveryIndex {
  version: typeof DISCOVERY_VERSION
  network: string
  generated_at: number
  commit: string
  markets: IndexMarket[]
}

export interface Staleness {
  ageSeconds: number
  stale: boolean
}

/** Outcome of loading one source (a registry index or a user-pinned solver card). */
export interface SourceResult {
  /** Registry base URL, or a reference to the local card (its URL or `local:<name>`). */
  source: string
  /** True when the source is a user-pinned solver card rather than a followed registry. */
  userAdded: boolean
  ok: boolean
  error?: Error
  /** Markets contributed by this source ([] when !ok). */
  markets: IndexMarket[]
  /** Only present for registry indexes (cards carry no timestamp by design). */
  staleness?: Staleness
}

/** A market in the merged, ranked cross-registry view, tagged with where it came from. */
export interface Market extends IndexMarket {
  source: string
  userAdded: boolean
}
