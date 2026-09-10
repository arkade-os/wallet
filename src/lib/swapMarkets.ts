/**
 * Wallet-side market discovery: the parts `@arkade-os/swap` deliberately does
 * not own — which registry to ask, which cards ship with the build, and the
 * pre-fee rate the swap composer displays.
 */
import { BTC_ASSET_ID, discoverMarkets as discover, findMarket } from '@arkade-os/swap'
import {
  displayPrice,
  isNetwork,
  type DiscoveredMarket,
  type LocalCardInput,
  type OfferPlan,
} from '@arkade-os/solver-discovery'
import type { NetworkName } from '@arkade-os/sdk'
import betaSolverCard from './beta-solver.card.json'
import { getSolverRegistryUrl } from './constants'
import { consoleLog } from './logs'
import { readSolverCards } from './solverCards'
import { assetSwapRepository, type AssetSwapQuoteSnapshot } from './swapRepository'

/**
 * Solver cards shipped with the wallet.
 *
 * The Arkade Labs Lightning solver is the counterparty for the RFQ send leg
 * (`arkade:BTC -> lightning:BTC`) and is not published in the solver registry
 * yet, so without this the corridor simply does not exist and Lightning send
 * is unavailable. Bundled rather than configured because the card carries its
 * own rendezvous (pubkey + nostr relays) — there is no URL to point at.
 *
 * The card is the solver's own `cli card` output, signature included — it
 * signs the current `transports.nostr.relays` shape. This client never
 * verifies the signature (pinning a card is the user's own trust decision),
 * but carrying the real one keeps the bundle byte-identical to what the
 * registry will list.
 *
 * Scoped to mainnet on purpose: the pubkey and relay in the card are the
 * production solver's, and offering it on regtest/signet would quote a
 * mainnet counterparty for testnet coins.
 */
// Exported so the Solvers settings screen can show built-in cards — a pinned
// solver invisible in Settings reads as "no solver at all".
export const BUNDLED_CARDS: LocalCardInput[] = [{ card: betaSolverCard as LocalCardInput['card'], network: 'bitcoin' }]

/**
 * Markets from the network's solver registry; [] when none is configured.
 * Caching (one hour, with a stale fallback for an unreachable registry) lives
 * in the repository the package writes through.
 */
export const discoverMarkets = async (network: NetworkName, useCache = true): Promise<DiscoveredMarket[]> => {
  if (!isNetwork(network)) return []
  return discover({
    network,
    registryUrl: getSolverRegistryUrl(network),
    repository: assetSwapRepository,
    localCards: [...BUNDLED_CARDS, ...readSolverCards()].filter((c) => c.network === network),
    logger: (...args) => consoleLog('solver discovery:', ...args),
    useCache,
  })
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

/**
 * The display facts a swap's market card knows and the chain does not.
 *
 * A restored record carries no quote snapshot — `AssetSwap` stores only what a
 * chain scan can rebuild — so its activity row names each leg from the asset
 * metadata cache, which the wallet fills for OWNED assets only. Swap away the
 * last of an asset and that cache never sees it again, so the row degrades to
 * a truncated asset id ("0abcbc23 to BTC"). The pair's own market card carries
 * the ticker and decimals the quote would have frozen, so recover them there.
 *
 * `findMarket` resolves both legacy 68-hex and CAIP-19 market ids, and its
 * `give` side is the deposit's: `base` means the from-leg is the base asset.
 *
 * A BTC leg is deliberately left out. The card names it BTC with 8 decimals,
 * while every swap surface shows sats — `buildAssetSwapActivityTx` derives
 * `sats`/0 for it already, and a snapshot saying otherwise would inflate the
 * receipt by 1e8.
 */
export const marketQuoteSnapshot = (
  markets: DiscoveredMarket[],
  fromAsset: string,
  toAsset: string,
): AssetSwapQuoteSnapshot | undefined => {
  const found = findMarket(markets, fromAsset, toAsset)
  const market = found?.market
  if (!market) return undefined
  const [from, to] =
    found.give === 'base' ? [market.base_asset, market.quote_asset] : [market.quote_asset, market.base_asset]
  return {
    feeBps: market.fee_bps,
    ...(fromAsset === BTC_ASSET_ID ? {} : { fromTicker: from.ticker, fromDecimals: from.decimals }),
    ...(toAsset === BTC_ASSET_ID ? {} : { toTicker: to.ticker, toDecimals: to.decimals }),
  }
}

/** The subset of {@link marketQuoteSnapshot} a record is still missing —
 * per field, so a real quote-time snapshot is never overwritten by the
 * card's current values. */
export const missingQuoteFacts = (
  swap: { fromAsset: string; toAsset: string; quote?: AssetSwapQuoteSnapshot },
  markets: DiscoveredMarket[],
): AssetSwapQuoteSnapshot | undefined => {
  const facts = marketQuoteSnapshot(markets, swap.fromAsset, swap.toAsset)
  if (!facts) return undefined
  const missing = Object.fromEntries(
    Object.entries(facts).filter(([key]) => swap.quote?.[key as keyof AssetSwapQuoteSnapshot] === undefined),
  ) as AssetSwapQuoteSnapshot
  return Object.keys(missing).length > 0 ? missing : undefined
}
