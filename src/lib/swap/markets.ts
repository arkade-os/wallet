import {
  bestMarket,
  discover,
  isNetwork,
  type DiscoveredMarket,
  type OfferPlan,
  type OfferSide,
} from '@arkade-os/solver-discovery'
import { getSolverRegistryUrl } from '../constants'
import { consoleLog } from '../logs'
import { Network } from '@arkade-os/boltz-swap'

export const BTC_ASSET_ID = 'btc'

/** Shared quote options so the react hook and imperative quotes agree.
 * No safety margin on top of the market fee: pricing drift between quote
 * and fill is the solver's risk to manage, not the maker's to prepay. */
export const QUOTE_OPTIONS = { safetyBps: 0 }

// v2: solver-discovery 0.1.3 changed the market schema (asset `decimals`,
// per-side string limits) — the key bump orphans caches of the old shape
const MARKETS_CACHE_KEY = 'solverMarkets-v2'
const MARKETS_CACHE_TTL_MS = 60 * 60 * 1000

interface MarketsCacheEntry {
  markets: DiscoveredMarket[]
  fetchedAt: number
}

const readMarketsCache = (network: Network): MarketsCacheEntry | undefined => {
  const key = `${MARKETS_CACHE_KEY}-${network}`
  const blob = localStorage.getItem(key)
  if (!blob) return undefined
  try {
    const entry = JSON.parse(blob)
    if (!Array.isArray(entry?.markets) || typeof entry?.fetchedAt !== 'number') throw new Error('malformed cache')
    return entry
  } catch {
    localStorage.removeItem(key)
    return undefined
  }
}

const writeMarketsCache = (network: Network, markets: DiscoveredMarket[]): void => {
  try {
    localStorage.setItem(`${MARKETS_CACHE_KEY}-${network}`, JSON.stringify({ markets, fetchedAt: Date.now() }))
  } catch {
    // best effort: a quota error just means the next boot refetches
  }
}

/**
 * Markets from the network's solver registry; [] when none is configured.
 * Registry content changes rarely, so results are cached for an hour and a
 * stale cache backstops an unreachable registry (quotes stay live either way).
 */
export const discoverMarkets = async (network: Network): Promise<DiscoveredMarket[]> => {
  const registry = getSolverRegistryUrl(network)
  if (!registry || !isNetwork(network)) return []
  const cached = readMarketsCache(network)
  if (cached && Date.now() - cached.fetchedAt < MARKETS_CACHE_TTL_MS) return cached.markets
  const { markets, warnings } = await discover({ registries: [registry], network })
  if (warnings.length) consoleLog('solver discovery:', ...warnings)
  // discover() isolates registry failures as warnings + zero markets, so an
  // empty result with a cache in hand reads as unreachable, not delisted
  if (markets.length === 0 && cached) return cached.markets
  if (markets.length > 0) writeMarketsCache(network, markets)
  return markets
}

/**
 * Best market for a from/to pair. All registry markets are BTC-based, so
 * `give` maps directly: paying BTC deposits the base side, receiving BTC
 * deposits the quote side. No market for asset↔asset pairs.
 */
export const findMarket = (
  markets: DiscoveredMarket[],
  fromId: string,
  toId: string,
): { market: DiscoveredMarket | null; give: OfferSide } | undefined => {
  if (fromId === toId) return undefined
  if (fromId === BTC_ASSET_ID) return { market: bestMarket(markets, { baseId: fromId, quoteId: toId }), give: 'base' }
  if (toId === BTC_ASSET_ID) return { market: bestMarket(markets, { baseId: toId, quoteId: fromId }), give: 'quote' }
  return undefined
}

export type PlanError = 'insufficient-balance' | 'side-disabled' | 'below-min' | 'above-max' | 'below-dust'

/** Validate a plan against the maker's balance and the server dust limit. */
export const validatePlan = (plan: OfferPlan, giveBalance: bigint, dust: bigint): PlanError | undefined => {
  if (plan.deposit.atomic > giveBalance) return 'insufficient-balance'
  // limits bound the receive side; null bounds mean the solver cannot pay it out
  const { min, max, withinLimits } = plan.limits
  if (!min || !max) return 'side-disabled'
  if (!withinLimits) return plan.receive.atomic < min.atomic ? 'below-min' : 'above-max'
  // the BTC side must survive as a VTXO: deposit when giving BTC, fill output otherwise
  const btcSide = plan.give === 'base' ? plan.deposit.atomic : plan.receive.atomic
  if (btcSide < dust) return 'below-dust'
  return undefined
}
