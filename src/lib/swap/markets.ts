import {
  bestMarket,
  discover,
  displayPrice,
  isNetwork,
  sideLimits,
  type DiscoveredMarket,
  type LocalCardInput,
  type OfferPlan,
  type Side,
} from '@arkade-os/solver-discovery'
import arklabsLightningCard from './arklabs-lightning.card.json'
import { getSolverRegistryUrl } from '../constants'
import { consoleLog } from '../logs'
import { getStorageItem, readSolverCardsFromStorage } from '../storage'
import type { NetworkName } from '@arkade-os/sdk'

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

/**
 * Solver cards shipped with the wallet.
 *
 * The Arkade Labs Lightning solver is the counterparty for the RFQ send leg
 * (`arkade:BTC -> lightning:BTC`) and is not published in the solver registry
 * yet, so without this the corridor simply does not exist and Lightning send
 * is unavailable. Bundled rather than configured because the card carries its
 * own registry signature and its rendezvous (pubkey + relays) — there is no
 * URL to point at.
 *
 * Scoped to mainnet on purpose: the pubkey and relay in the card are the
 * production solver's, and offering it on regtest/signet would quote a
 * mainnet counterparty for testnet coins.
 */
const BUNDLED_CARDS: LocalCardInput[] = [{ card: arklabsLightningCard as LocalCardInput['card'], network: 'bitcoin' }]

const MARKETS_CACHE_KEY = 'swapMarkets'
const MARKETS_CACHE_TTL_MS = 60 * 60 * 1000

interface MarketsCacheEntry {
  markets: DiscoveredMarket[]
  fetchedAt: number
}

// keyed by network AND registry so a redeployed registry override never
// serves markets cached from a different registry
const cacheKey = (network: NetworkName, registry: string) => `${MARKETS_CACHE_KEY}-${network}-${registry}`

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

const readMarketsCache = (network: NetworkName, registry: string): MarketsCacheEntry | undefined =>
  getStorageItem<MarketsCacheEntry | undefined>(cacheKey(network, registry), undefined, (blob) => {
    const entry = JSON.parse(blob)
    if (!Array.isArray(entry?.markets) || typeof entry?.fetchedAt !== 'number') throw new Error('malformed cache')
    if (!entry.markets.every(isMarketShaped)) throw new Error('malformed cached market')
    return entry
  })

const writeMarketsCache = (network: NetworkName, registry: string, markets: DiscoveredMarket[]): void => {
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
export const discoverMarkets = async (network: NetworkName, useCache = true): Promise<DiscoveredMarket[]> => {
  const localCards = [...BUNDLED_CARDS, ...readSolverCardsFromStorage()].filter((c) => c.network === network)
  const registry = getSolverRegistryUrl(network)
  if (!registry || !isNetwork(network)) return []
  const cached = readMarketsCache(network, registry)
  if (useCache && cached && Date.now() - cached.fetchedAt < MARKETS_CACHE_TTL_MS) return cached.markets
  const { markets, sources, warnings } = await discover({ registries: [registry], localCards, network })
  if (warnings.length) consoleLog('solver discovery:', ...warnings)
  // an unreachable registry (fetch/validation failure) falls back to the stale
  // cache; a reachable registry is authoritative even when it emptied out
  const reachable = sources.some((source) => source.ok)
  if (!reachable && cached) return cached.markets
  if (reachable) writeMarketsCache(network, registry, markets)
  return markets
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

/** The market feed's pre-fee price oriented give→receive, in whole display
 * units. Derived from the plan's exact price rational — plan.priceDisplay
 * truncates at 8 fraction digits, which zeroes or skews small prices, and the
 * give-quote inversion would amplify that loss. Assumes the wallet's
 * safetyBps of 0 (QUOTE_OPTIONS): fee_bps is then the only gap between this
 * rate and the plan's net payout. */
export const preFeeDisplayRate = (plan: OfferPlan): number => {
  const { num, den } = displayPrice(plan.price, {
    baseDecimals: plan.market.base_asset.decimals,
    quoteDecimals: plan.market.quote_asset.decimals,
  })
  const rate = plan.give === 'base' ? Number(num) / Number(den) : Number(den) / Number(num)
  return Number.isFinite(rate) && rate > 0 ? rate : 0
}

export type PlanError = 'insufficient-balance' | 'side-disabled' | 'below-min' | 'above-max' | 'below-dust'

/** Validate a plan against the maker's balance and the server dust limit. */
export const validatePlan = (plan: OfferPlan, giveBalance: bigint, dust: bigint): PlanError | undefined => {
  if (plan.deposit.atomic > giveBalance) return 'insufficient-balance'
  // limits bound the receive side; null bounds mean the solver cannot pay it out
  const { min, max, withinLimits } = plan.limits
  if (!min || !max) return 'side-disabled'
  // the SDK's plan.limits only covers the receive side, but the market card
  // bounds BOTH sides — enforce the give side (atomic units of the deposit
  // asset) or the solver rejects the offer at fill time. sideLimits reads a
  // disabled or malformed bound as null, so a bad feed fails safe here.
  const giveLimits = sideLimits(plan.market, plan.give)
  if (!giveLimits) return 'side-disabled'
  if (plan.deposit.atomic < giveLimits.min) return 'below-min'
  if (plan.deposit.atomic > giveLimits.max) return 'above-max'
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
