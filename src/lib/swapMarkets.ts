/**
 * Wallet-side market discovery: the parts `@arkade-os/swap` deliberately does
 * not own — which registry to ask, which cards ship with the build, and the
 * pre-fee rate the swap composer displays.
 */
import { discoverMarkets as discover } from '@arkade-os/swap'
import {
  displayPrice,
  isNetwork,
  validateCard,
  type DiscoveredMarket,
  type LocalCardInput,
  type OfferPlan,
} from '@arkade-os/solver-discovery'
import type { NetworkName } from '@arkade-os/sdk'
import betaSolverCard from './beta-solver.card.json'
import { getSolverRegistryUrl } from './constants'
import { consoleLog } from './logs'
import { getStorageItem } from './storage'
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

const CARDS_KEY = 'solverCards'

let cardsVersion = 0
const cardListeners = new Set<() => void>()

const isLocalCardInput = (obj: unknown): obj is LocalCardInput => {
  const input = obj as LocalCardInput | null
  return Boolean(
    input &&
      typeof input.network === 'string' &&
      typeof input.label === 'string' &&
      typeof input.card === 'object' &&
      validateCard(input.card).ok,
  )
}

export const readSolverCards = (): LocalCardInput[] => {
  const items = getStorageItem(CARDS_KEY, [], (val) => JSON.parse(val))
  return Array.isArray(items) ? items.filter(isLocalCardInput) : []
}

/**
 * Writers are spread out — the Solvers screen, and the Nostr restore, which
 * lands a card well after per-network discovery has run — so the version below
 * is what lets React re-derive off a write it cannot otherwise see.
 */
export const saveSolverCards = (cards: LocalCardInput[]): void => {
  localStorage.setItem(CARDS_KEY, JSON.stringify(Array.isArray(cards) ? cards.filter(isLocalCardInput) : []))
  cardsVersion += 1
  cardListeners.forEach((fn) => fn())
}

export const getSolverCardsVersion = (): number => cardsVersion

export const subscribeSolverCards = (fn: () => void): (() => void) => {
  cardListeners.add(fn)
  return () => {
    cardListeners.delete(fn)
  }
}

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
