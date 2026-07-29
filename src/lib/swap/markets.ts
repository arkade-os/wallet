import {
  bestMarket,
  discover,
  isNetwork,
  stableStringify,
  type DiscoveredMarket,
  type Network as SolverNetwork,
  type OfferPlan,
  type Side,
} from '@arkade-os/solver-discovery'
import { getSolverRegistryUrl } from '../constants'
import { consoleLog } from '../logs'
import { getStorageItem, setStorageItemSafely } from '../storage'
import { isValidUrl } from '../validators'
import { getPinnedSolverCards, type PinnedSolverCard } from './solverCards'
import { Network } from '@arkade-os/boltz-swap'

export const BTC_ASSET_ID = 'btc'

/** Shared quote options so the react hook and imperative quotes agree.
 * No safety margin on top of the market fee: pricing drift between quote
 * and fill is the solver's risk to manage, not the maker's to prepay. */
export const QUOTE_OPTIONS = { safetyBps: 0 }

/** Feed fetcher with a short per-URL TTL cache. The quote hook refetches the
 * market's price feed on every debounced keystroke, and public feeds
 * (CoinGecko) rate-limit that burst hard enough that big amounts reliably die
 * as "Quote unavailable" mid-typing — one feed value per TTL window is fresh
 * enough for a preview whose rate is re-checked at fill anyway.
 * ponytail: no stale-serve when the fetch itself fails; add one if feeds
 * flake beyond the TTL window (cap the staleness — the feed value becomes
 * the covenant floor, so an old price must never price a real offer).
 * Keyed on the request URL, so it assumes a market's feed URL is stable and
 * amount-invariant (true today); a cache-busting nonce would silently make it
 * a no-op — the flat-feedCalls swap test guards against that regressing. */
export const makeCachedFeedFetch = (ttlMs = 30_000): typeof fetch => {
  const cache = new Map<string, { at: number; body: string }>()
  return async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    const hit = cache.get(url)
    if (hit && Date.now() - hit.at < ttlMs) return new Response(hit.body)
    const response = await fetch(input, init)
    if (response.ok) cache.set(url, { at: Date.now(), body: await response.clone().text() })
    return response
  }
}

const MARKETS_CACHE_KEY = 'swapMarkets'
const MARKETS_CACHE_TTL_MS = 60 * 60 * 1000

interface MarketsCacheEntry {
  markets: DiscoveredMarket[]
  fetchedAt: number
}

// keyed by network AND the followed registry set, so a redeployed registry
// override — or a user adding/removing a registry — never serves markets
// cached from a different set
const cacheKey = (network: Network, registry: string) => `${MARKETS_CACHE_KEY}-${network}-${registry}`

/** Drop every cached market set for `network`; the next discovery refetches
 * from the followed registries. */
export const clearMarketsCache = (network: Network): void => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`${MARKETS_CACHE_KEY}-${network}-`)) localStorage.removeItem(key)
  }
}

const USER_REGISTRIES_KEY = 'solverRegistries'

const readUserRegistries = (): Record<string, string[]> =>
  getStorageItem<Record<string, string[]>>(USER_REGISTRIES_KEY, {}, (blob) => {
    const parsed = JSON.parse(blob)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('malformed registries')
    return parsed
  })

const writeUserRegistries = (all: Record<string, string[]>): boolean =>
  setStorageItemSafely(USER_REGISTRIES_KEY, JSON.stringify(all), 'Failed to save solver registries')

/** Extra registry indexes the user follows (Settings > Solvers), per network. */
export const getUserRegistries = (network: Network): string[] =>
  (readUserRegistries()[network] ?? []).filter((url) => typeof url === 'string')

/** Follow another registry index for `network` — its markets join discovery,
 * deduped and ranked against the default registry's by the SDK. Returns an
 * error message, or undefined on success. */
export const addUserRegistry = (network: Network, url: string): string | undefined => {
  if (!url || !isValidUrl(url)) return 'not a valid registry URL'
  const normalized = /^https?:\/\//.test(url) ? url : `https://${url}`
  if (normalized === getSolverRegistryUrl(network)) return 'that is the default registry'
  const all = readUserRegistries()
  const list = all[network] ?? []
  if (list.includes(normalized)) return 'registry already followed'
  if (!writeUserRegistries({ ...all, [network]: [...list, normalized] })) {
    return 'could not save the registry — storage is full or unavailable'
  }
}

export const removeUserRegistry = (network: Network, url: string): void => {
  const all = readUserRegistries()
  writeUserRegistries({ ...all, [network]: (all[network] ?? []).filter((stored) => stored !== url) })
}

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

/** Markets from the user's pinned solver cards (Settings > Solvers). Purely
 * local — with no registries, discover() only schema-validates the cards, so
 * a card that turned invalid in storage is skipped with a warning instead of
 * breaking discovery. Memoized on the pinned list's identity (stable while
 * storage is unchanged), so calls between pins — every mount, tab return and
 * refresh — skip re-validating cards that did not change. */
let localMarketsCache: { pinned: PinnedSolverCard[]; markets: DiscoveredMarket[] } | undefined
const discoverLocalMarkets = async (network: SolverNetwork): Promise<DiscoveredMarket[]> => {
  const pinned = getPinnedSolverCards(network)
  if (pinned.length === 0) return []
  if (localMarketsCache?.pinned === pinned) return localMarketsCache.markets
  const localCards = pinned.map(({ card }) => ({ card, network }))
  const { markets, warnings } = await discover({ registries: [], localCards, network })
  if (warnings.length) consoleLog('solver discovery (pinned cards):', ...warnings)
  localMarketsCache = { pinned, markets }
  return markets
}

/** Canonical JSON (sorted keys, no whitespace) — the identity discover() uses
 * to dedupe across sources: provenance differs by construction (registry URL
 * vs local:<name>), the listing is what must not double up. Keys are really
 * deleted so the string matches what discover() hashes pre-provenance. */
const marketIdentity = (market: DiscoveredMarket): string => {
  const listing = { ...market } as Partial<DiscoveredMarket>
  delete listing.source
  delete listing.sourceType
  return stableStringify(listing)
}

/** Merge registry and pinned-card markets the way a single discover() call
 * would: byte-identical entries collapse (a pinned solver that is also listed
 * publicly), then rank per id pair by fee_bps with input order — registry
 * first — as the tiebreak. Needed because registry markets may come from the
 * cache while pinned cards are always read live. */
const mergeMarkets = (registryMarkets: DiscoveredMarket[], localMarkets: DiscoveredMarket[]): DiscoveredMarket[] => {
  if (localMarkets.length === 0) return registryMarkets
  const seen = new Set(registryMarkets.map(marketIdentity))
  const merged = [...registryMarkets]
  for (const market of localMarkets) {
    const key = marketIdentity(market)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(market)
  }
  const pairKey = (market: DiscoveredMarket) => `${market.base_asset.id}/${market.quote_asset.id}`
  // stable sort, so equal (pair, fee) keys keep registry-first input order
  merged.sort((a, b) => {
    const keyA = pairKey(a)
    const keyB = pairKey(b)
    return keyA !== keyB ? (keyA < keyB ? -1 : 1) : a.fee_bps - b.fee_bps
  })
  return merged
}

/**
 * Markets from the network's default solver registry, any registries the user
 * follows, and the user's pinned solver cards; [] when none is configured.
 * Registry content changes rarely, so registry results are cached for an hour
 * and a stale cache backstops an unreachable registry (quotes stay live
 * either way). Pinned cards live in local storage and are merged fresh on
 * every call, so pinning or removing a solver takes effect without waiting
 * out the registry cache.
 */
export const discoverMarkets = async (network: Network): Promise<DiscoveredMarket[]> => {
  if (!isNetwork(network)) return []
  const builtin = getSolverRegistryUrl(network)
  const registries = [...(builtin ? [builtin] : []), ...getUserRegistries(network)]
  const localMarkets = await discoverLocalMarkets(network)
  if (registries.length === 0) return localMarkets
  const registrySet = registries.join(' ')
  const cached = readMarketsCache(network, registrySet)
  if (cached && Date.now() - cached.fetchedAt < MARKETS_CACHE_TTL_MS) return mergeMarkets(cached.markets, localMarkets)
  const { markets, sources, warnings } = await discover({ registries, network })
  if (warnings.length) consoleLog('solver discovery:', ...warnings)
  // an unreachable registry set (every source failing) falls back to the
  // stale cache; any reachable registry is authoritative even when it
  // emptied out.
  // ponytail: reachability is per set, so markets from a temporarily
  // unreachable secondary registry drop out until it recovers; add
  // per-registry stale-merge if that ever bites
  const reachable = sources.some((source) => source.ok)
  if (!reachable && cached) return mergeMarkets(cached.markets, localMarkets)
  if (reachable) writeMarketsCache(network, registrySet, markets)
  return mergeMarkets(markets, localMarkets)
}

/** Best market for a from/to pair, in either orientation. `give` is the side
 * the sender deposits; `wantSide` skips markets whose receive side is
 * disabled (max = "0"). */
export const findMarket = (
  markets: DiscoveredMarket[],
  fromId: string,
  toId: string,
): { market: DiscoveredMarket | null; give: Side } | undefined => {
  if (fromId === toId) return undefined
  const givingBase = bestMarket(markets, { baseId: fromId, quoteId: toId, wantSide: 'quote' })
  if (givingBase) return { market: givingBase, give: 'base' }
  return { market: bestMarket(markets, { baseId: toId, quoteId: fromId, wantSide: 'base' }), give: 'quote' }
}

export type PlanError = 'insufficient-balance' | 'side-disabled' | 'below-min' | 'above-max' | 'below-dust'

/** Validate a plan against the maker's balance and the server dust limit. */
export const validatePlan = (plan: OfferPlan, giveBalance: bigint, dust: bigint): PlanError | undefined => {
  if (plan.deposit.atomic > giveBalance) return 'insufficient-balance'
  // limits bound the receive side; null bounds mean the solver cannot pay it out
  const { min, max, withinLimits } = plan.limits
  if (!min || !max) return 'side-disabled'
  // the SDK's plan.limits only covers the receive side, but the market card
  // bounds BOTH sides — enforce the give side (min/max_*_amount, atomic units
  // of the deposit asset) or the solver rejects the offer at fill time
  const giveSide = plan.give === 'base'
  const giveMin = BigInt(giveSide ? plan.market.min_base_amount : plan.market.min_quote_amount)
  const giveMax = BigInt(giveSide ? plan.market.max_base_amount : plan.market.max_quote_amount)
  if (giveMax === BigInt(0)) return 'side-disabled'
  if (plan.deposit.atomic < giveMin) return 'below-min'
  if (plan.deposit.atomic > giveMax) return 'above-max'
  if (!withinLimits) return plan.receive.atomic < min.atomic ? 'below-min' : 'above-max'
  // a BTC side must survive as a VTXO — picked by asset id, not market
  // orientation, since a registry may publish BTC as base or quote. An
  // asset↔asset plan has no BTC leg to protect: both sides ride the SDK's
  // own dust-sat carriers.
  const depositIsBtc = plan.deposit.asset.id === BTC_ASSET_ID
  const receiveIsBtc = plan.receive.asset.id === BTC_ASSET_ID
  if (depositIsBtc || receiveIsBtc) {
    const btcSide = depositIsBtc ? plan.deposit.atomic : plan.receive.atomic
    if (btcSide < dust) return 'below-dust'
  }
  return undefined
}
