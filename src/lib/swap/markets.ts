import {
  bestMarket,
  discover,
  isNetwork,
  type DiscoveredMarket,
  type OfferPlan,
  type Side,
} from '@arkade-os/solver-discovery'
import { getSolverRegistryUrl } from '../constants'
import { consoleLog } from '../logs'
import { getStorageItem } from '../storage'
import { Network } from '@arkade-os/boltz-swap'

export const BTC_ASSET_ID = 'btc'

/** Shared quote options so the react hook and imperative quotes agree.
 * No safety margin on top of the market fee: pricing drift between quote
 * and fill is the solver's risk to manage, not the maker's to prepay. */
export const QUOTE_OPTIONS = { safetyBps: 0 }

const MARKETS_CACHE_KEY = 'swapMarkets'
const MARKETS_CACHE_TTL_MS = 60 * 60 * 1000

interface MarketsCacheEntry {
  markets: DiscoveredMarket[]
  fetchedAt: number
}

// keyed by network AND registry so a redeployed registry override never
// serves markets cached from a different registry
const cacheKey = (network: Network, registry: string) => `${MARKETS_CACHE_KEY}-${network}-${registry}`

const isMarketShaped = (m: unknown): boolean => {
  const market = m as DiscoveredMarket | null
  return Boolean(
    market &&
      typeof market.pair === 'string' &&
      market.base_asset &&
      typeof market.base_asset.id === 'string' &&
      market.quote_asset &&
      typeof market.quote_asset.id === 'string' &&
      typeof market.quote_asset.decimals === 'number',
  )
}

const readMarketsCache = (network: Network, registry: string): MarketsCacheEntry | undefined =>
  getStorageItem<MarketsCacheEntry | undefined>(cacheKey(network, registry), undefined, (blob) => {
    const entry = JSON.parse(blob)
    if (!Array.isArray(entry?.markets) || typeof entry?.fetchedAt !== 'number') throw new Error('malformed cache')
    if (!entry.markets.every(isMarketShaped)) throw new Error('malformed cached market')
    return entry
  })

const writeMarketsCache = (network: Network, registry: string, markets: DiscoveredMarket[]): void => {
  try {
    localStorage.setItem(cacheKey(network, registry), JSON.stringify({ markets, fetchedAt: Date.now() }))
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
  console.log('discovered markets', { registry, isNetwork: isNetwork(network) })
  if (!registry || !isNetwork(network)) return []
  const cached = readMarketsCache(network, registry)
  console.log('discovered markets', { registry, isNetwork: isNetwork(network), cached })
  if (cached && Date.now() - cached.fetchedAt < MARKETS_CACHE_TTL_MS) return cached.markets
  const { markets, sources, warnings } = await discover({ registries: [registry], network })
  if (warnings.length) consoleLog('solver discovery:', ...warnings)
  // an unreachable registry (fetch/validation failure) falls back to the stale
  // cache; a reachable registry is authoritative even when it emptied out
  const reachable = sources.some((source) => source.ok)
  if (!reachable && cached) return cached.markets
  if (reachable) writeMarketsCache(network, registry, markets)
  console.log('discovered markets', { registry, isNetwork: isNetwork(network), markets, sources, warnings })
  return markets
}

/**
 * Best market for a from/to pair. All registry markets are BTC-based, so
 * `give` maps directly: paying BTC deposits the base side, receiving BTC
 * deposits the quote side. `wantSide` skips markets whose receive side is
 * disabled (max = "0"). No market for asset↔asset pairs.
 */
export const findMarket = (
  markets: DiscoveredMarket[],
  fromId: string,
  toId: string,
): { market: DiscoveredMarket | null; give: Side } | undefined => {
  if (fromId === toId) return undefined
  if (fromId === BTC_ASSET_ID) {
    return { market: bestMarket(markets, { baseId: fromId, quoteId: toId, wantSide: 'quote' }), give: 'base' }
  }
  if (toId === BTC_ASSET_ID) {
    return { market: bestMarket(markets, { baseId: toId, quoteId: fromId, wantSide: 'base' }), give: 'quote' }
  }
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
