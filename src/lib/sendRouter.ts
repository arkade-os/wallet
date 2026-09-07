/**
 * The send path's `PaymentRouter`. The fallback is not written here: a rail whose
 * `available()` returns false or throws is dropped from `options()` without
 * taking the router with it, replacing a six-case refusal enum. Amounts are
 * receiver-exact; the screen translates from "what leaves" at the boundary,
 * which keeps "send max" working.
 */
import {
  PaymentRouter,
  arkTarget,
  btcTarget,
  invoiceTarget,
  makeHandle,
  type Asset,
  type IWallet,
  type PaymentRail,
  type RouteQuote,
} from '@arkade-os/sdk'
import { LIGHTNING_RAIL, ONCHAIN_SWAP_RAIL, lightningRail, onchainSwapRail, type SwapRailClient } from '@arkade-os/swap'
import { sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { collaborativeExitWithFees, sendAssets } from './asp'
import { decodeInvoice } from './bolt11'
import { prettyNumber } from './format'
import { defaultFee } from './constants'

export const WALLET_EXIT_RAIL = 'onchain'

export const ASSET_RAIL = 'asset'

export const ONCHAIN_ROUTE_LOG = 'onchain send:'

export { LIGHTNING_RAIL, ONCHAIN_SWAP_RAIL }

/** Not the SDK's `onchainRail`: that offboards with its own coin selection. */
export const walletExitRail = (deps: { outputFee: () => number }): PaymentRail => ({
  id: WALLET_EXIT_RAIL,
  // The same classification the SDK's `onchainRail` uses, so this rail cannot
  // claim an ark address or an invoice if the router is reused for them.
  match: (req) => btcTarget(req.raw) !== undefined,
  available: (req) => (req.amount ?? 0) > 0,
  quote: async (req, ctx) => {
    const amount = req.amount!
    const fee = deps.outputFee()
    const total = amount + fee
    return {
      railId: WALLET_EXIT_RAIL,
      amount,
      fee,
      total,
      send: async () =>
        makeHandle(WALLET_EXIT_RAIL, async (emit) => {
          const txid = await collaborativeExitWithFees(ctx.wallet, total, amount, req.raw)
          const result = { railId: WALLET_EXIT_RAIL, txid }
          emit({ status: 'settled', result })
          return result
        }),
    }
  },
})

/** Assets ride the deps, not the request: a `PaymentRequest` carries sats. */
export const assetRail = (deps: { assets: Asset[] }): PaymentRail => ({
  id: ASSET_RAIL,
  match: (req) => arkTarget(req.raw) !== undefined,
  available: () => deps.assets.length > 0,
  quote: async (req, ctx) => ({
    railId: ASSET_RAIL,
    amount: 0,
    fee: defaultFee,
    total: defaultFee,
    send: async () =>
      makeHandle(ASSET_RAIL, async (emit) => {
        const txid = await sendAssets(ctx.wallet, arkTarget(req.raw)!, deps.assets)
        // Terminal in one step: no counterparty acts, so the txid IS settlement.
        const result = { railId: ASSET_RAIL, txid }
        emit({ status: 'settled', result })
        return result
      }),
  }),
})

/** Optional per-rail deps: a rail whose deps are absent is not registered,
 *  which is the drop `available()` performs, one step earlier. */
export interface SendRouterDeps {
  wallet: IWallet
  /** The driving tab's client; a tab without the Web Lock has none. */
  client?: SwapRailClient
  /** sat/vB the L1 claim is priced at; it comes out of the recipient's payout. */
  claimFeeRateSatVb?: number
  outputFee?: () => number
  assets?: Asset[]
}

export const createSendRouter = (deps: SendRouterDeps): PaymentRouter => {
  const router = new PaymentRouter({
    // Forced: `RouterContext.wallet` is the concrete `Wallet` and this app holds a
    // `ServiceWorkerWallet` — implements `IWallet`, does not extend it, so nominally
    // illegal with no narrower cast. Goes when the SDK types it `IWallet`; see #950.
    wallet: deps.wallet as unknown as ConstructorParameters<typeof PaymentRouter>[0]['wallet'],
    prefs: { priority: [ONCHAIN_SWAP_RAIL, WALLET_EXIT_RAIL, LIGHTNING_RAIL, ASSET_RAIL] },
  })

  if (deps.client && deps.claimFeeRateSatVb) {
    router.use(onchainSwapRail(deps.client, { claimFeeRateSatVb: deps.claimFeeRateSatVb }))
  }
  if (deps.outputFee) router.use(walletExitRail({ outputFee: deps.outputFee }))
  if (deps.client) router.use(lightningRail(deps.client))
  if (deps.assets) router.use(assetRail({ assets: deps.assets }))
  return router
}

/** Why the Lightning rail dropped itself: `options()` reports absence, not
 *  cause, and the send form told these two apart before routing. */
export const lnSendRefusal = (markets: DiscoveredMarket[]): string => {
  const market = markets.find((m) => m.quote_corridor === 'lightning')
  const bounds = market && sideLimits(market, 'quote')
  if (!bounds) return 'No Lightning solver available'
  return `Amount outside solver bounds (${prettyNumber(Number(bounds.min))}-${prettyNumber(Number(bounds.max))} sats)`
}

/** The Lightning analogue of {@link quoteIsForThisSend}. By payment hash: the
 *  rail's `meta` carries `quote.lock.hash` and never the BOLT11, so a
 *  `meta.invoice` test would refuse every send rather than a mismatched one. */
export const quoteIsForThisInvoice = (quote: Pick<RouteQuote, 'meta'>, invoice: string): boolean => {
  const target = invoiceTarget(invoice)
  if (target === undefined) return false
  const quoted = quote.meta?.paymentHash
  if (typeof quoted !== 'string' || !quoted) return false
  try {
    const { paymentHash } = decodeInvoice(target)
    return Boolean(paymentHash) && paymentHash.toLowerCase() === quoted.toLowerCase()
  } catch {
    return false
  }
}

/** Quoting lazily already removes the stale quote behind the wrong-address bug.
 *  This is the belt to that braces — a rail may quote worse than advertised. */
export const quoteIsForThisSend = (
  quote: Pick<RouteQuote, 'amount' | 'total'>,
  screen: { destination?: string; satoshis?: number; total?: number },
  routedAddress: string,
): boolean =>
  screen.destination === routedAddress && quote.amount === screen.satoshis && quote.total <= (screen.total ?? 0)
