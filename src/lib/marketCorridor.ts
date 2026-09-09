/**
 * Which rail a market side settles on.
 *
 * arkade-os/solver-registry#23 moves the corridor into the asset id as a CAIP-19
 * namespace and drops `pair`/`base_corridor`/`quote_corridor` — a change no type
 * error catches, so the derivation lives here once. Both shapes are read: the
 * wallet ships before the index flips, so until then the old shape is what the
 * index, the discovery cache and users' pinned cards still serve.
 */
import type { Side } from '@arkade-os/solver-discovery'

export type Corridor = 'arkade' | 'bolt11' | 'bitcoin' | 'eip155'

const CORRIDORS: readonly string[] = ['arkade', 'bolt11', 'bitcoin', 'eip155']

/** Pre-#23 corridor names, mapped onto the vocabulary that replaced them. */
const LEGACY_CORRIDORS: Record<string, Corridor> = {
  arkade: 'arkade',
  lightning: 'bolt11',
  onchain: 'bitcoin',
}

const LEGACY_FIELD = { base: 'base_corridor', quote: 'quote_corridor' } as const

type MarketLike = { base_asset?: unknown; quote_asset?: unknown }

const assetOf = (market: MarketLike, side: Side): { id?: unknown; ticker?: unknown } | undefined =>
  (side === 'base' ? market.base_asset : market.quote_asset) as { id?: unknown; ticker?: unknown } | undefined

/** A CAIP-19 id's chain namespace: before the first ":", which must precede the "/". */
const chainNamespaceOf = (id: unknown): string | undefined => {
  if (typeof id !== 'string') return undefined
  const slash = id.indexOf('/')
  const colon = id.indexOf(':')
  return slash === -1 || colon === -1 || colon > slash ? undefined : id.slice(0, colon)
}

/** A legacy id (`btc`, a bare AssetId) has no namespace, so the dropped field answers instead. */
export const marketCorridor = (market: MarketLike, side: Side): Corridor => {
  const namespace = chainNamespaceOf(assetOf(market, side)?.id)
  if (namespace !== undefined) return CORRIDORS.includes(namespace) ? (namespace as Corridor) : 'arkade'
  const legacy = (market as Record<string, unknown>)[LEGACY_FIELD[side]]
  return typeof legacy === 'string' ? (LEGACY_CORRIDORS[legacy] ?? 'arkade') : 'arkade'
}

/** Either side off the arkade rail: negotiated per-trade over RFQ, not filled from the arkd stream. */
export const isRfqMarket = (market: MarketLike): boolean =>
  marketCorridor(market, 'base') !== 'arkade' || marketCorridor(market, 'quote') !== 'arkade'

const sideLabel = (market: MarketLike, side: Side): string => {
  const ticker = assetOf(market, side)?.ticker
  const label = typeof ticker === 'string' && ticker.length > 0 ? ticker : '?'
  const corridor = marketCorridor(market, side)
  return corridor === 'arkade' ? label : `${corridor}:${label}`
}

/** The display label `pair` carried until #23 removed it. Display only; grouping is by asset id. */
export const marketPairLabel = (market: MarketLike): string =>
  `${sideLabel(market, 'base')}/${sideLabel(market, 'quote')}`
