/**
 * Wallet-side market discovery: the parts `@arkade-os/swap` deliberately does
 * not own — which registry to ask, which cards ship with the build, and the
 * pre-fee rate the swap composer displays.
 *
 * Discovery itself is the client's now: `createSwapClient` takes these options
 * once and routes every quote against them. The shape satisfies both the v2
 * client's `DiscoveryConfig` and the package's own `discoverMarkets`, which is
 * what lets one definition feed the client and the lock-free read below.
 */
import { discoverMarkets as discover, type DiscoverMarketsOptions } from '@arkade-os/swap'
import {
  DEFAULT_NETWORK,
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
import { readSolverCardsFromStorage } from './storage'
import { assetSwapRepository } from './swapRepository'

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
 * What the client discovers markets with. Caching (one hour, with a stale
 * fallback for an unreachable registry) lives in the repository it writes
 * through, which is why `repository` is the client's to supply and not here.
 *
 * A network solver discovery has no name for — `testnet` is the only one today —
 * keeps its own registry lookup and its own card filter, both of which answer
 * nothing, and borrows `DEFAULT_NETWORK` only to satisfy the type. With no
 * registry URL and no cards the result is `[]`, which is the same answer the
 * wallet's own `isNetwork` guard used to give before the call was made.
 */
export const discoveryOptions = (network: NetworkName): Omit<DiscoverMarketsOptions, 'repository' | 'useCache'> => ({
  network: isNetwork(network) ? network : DEFAULT_NETWORK,
  registryUrl: isNetwork(network) ? getSolverRegistryUrl(network) : undefined,
  localCards: [...BUNDLED_CARDS, ...readSolverCardsFromStorage()].filter((c) => c.network === network),
  logger: (...args) => consoleLog('solver discovery:', ...args),
})

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
 * Markets from the network's solver registry; [] when none is configured.
 *
 * `client.markets()` is the same call with the same options — but discovery is
 * a read, and the swap client only exists in the tab holding the drive lock.
 * Reading the registry through the client would leave a second tab with no
 * markets and therefore no swap UI at all, with nothing to explain why. So the
 * read stays here and the client keeps discovery for the routing it does
 * internally.
 */
export const discoverMarkets = async (network: NetworkName, useCache = true): Promise<DiscoveredMarket[]> =>
  discover({ ...discoveryOptions(network), repository: assetSwapRepository, useCache })
