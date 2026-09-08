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
  type PaymentHandle,
  type PaymentRail,
  type PaymentRequest,
  type RouteQuote,
  type RouteResult,
} from '@arkade-os/sdk'
import { LIGHTNING_RAIL, ONCHAIN_SWAP_RAIL, lightningRail, onchainSwapRail, type SwapRailClient } from '@arkade-os/swap'
import { sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { collaborativeExitWithFees, sendAssets } from './asp'
import { decodeInvoice } from './bolt11'
import { consoleError } from './logs'
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
    wallet: deps.wallet,
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

/** An amount-bearing invoice pins the take leg by existing, and the client throws
 *  `AmountMismatch` on a request pinning it twice — even when the two agree. */
export const lnSendRequest = (invoice: string, satoshis?: number): PaymentRequest => {
  const target = invoiceTarget(invoice)
  if (target !== undefined) {
    try {
      if (decodeInvoice(target).amountSats > 0) return { raw: invoice }
    } catch {
      // Undecodable is the rail's refusal to name, not this builder's.
    }
  }
  return { raw: invoice, ...(satoshis === undefined ? {} : { amount: satoshis }) }
}

/** Why the Lightning rail dropped itself. `options()` logs the rail's error and
 *  returns only survivors, so bounds are named only where checked and missed. */
export const lnSendRefusal = (markets: DiscoveredMarket[], satoshis?: number): string => {
  const bounds = markets
    .filter((m) => m.quote_corridor === 'lightning')
    .map((m) => sideLimits(m, 'quote'))
    .filter((limits): limits is NonNullable<typeof limits> => limits !== null)
  if (bounds.length === 0) return 'No Lightning solver available'
  const min = bounds.reduce((low, b) => (b.min < low ? b.min : low), bounds[0].min)
  const max = bounds.reduce((high, b) => (b.max > high ? b.max : high), bounds[0].max)
  const span = `${prettyNumber(Number(min))}-${prettyNumber(Number(max))} sats`
  const amount = satoshis === undefined ? undefined : BigInt(satoshis)
  if (amount !== undefined && !bounds.some((b) => amount >= b.min && amount <= b.max)) {
    return `Amount outside solver bounds (${span})`
  }
  return `No Lightning solver took this payment (solvers take ${span}). The router does not report why a rail dropped; the reason is in the console log.`
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

/** What an on-chain send really costs, asked before the sign screen commits to a
 *  total. `calcOnchainOutputFee()` is the collaborative exit's fee and no other
 *  rail's, so pricing the screen with it leaves {@link quoteIsForThisSend} a
 *  ceiling only the exit can meet. The spend re-quotes against this figure. */
export const previewOnchainCost = async (
  router: PaymentRouter,
  address: string,
  amount: number,
): Promise<Pick<RouteQuote, 'amount' | 'fee' | 'total'> | undefined> => {
  for (const option of await router.options({ raw: address, amount })) {
    try {
      const quote = await option.quote()
      // A rail paying something else is not the one being priced.
      if (quote.amount === amount) return { amount: quote.amount, fee: quote.fee, total: quote.total }
    } catch (err) {
      // Not left to the spend: it can reach a different answer, and then the
      // screen is committed to this pass's price with nobody having logged why.
      consoleError(err, `${ONCHAIN_ROUTE_LOG} ${option.railId} could not be priced`)
    }
  }
  return undefined
}

/** Resolve when the rail reports the funding done, not when the swap ends.
 *  `"sent"` is core's word for it and both swap rails emit it once the covenant
 *  holds the money; `settled()` waits for the counterparty, an L1 confirmation
 *  away on `arkade -> onchain`. `done` guards the replay `subscribe` fires
 *  before it has returned the unsubscribe. */
export const fundedResult = (handle: PaymentHandle): Promise<RouteResult | undefined> =>
  new Promise((resolve, reject) => {
    let done = false
    let stop: (() => void) | undefined
    const unsubscribe = handle.subscribe((update) => {
      if (done) return
      if (update.status === 'sent' || update.status === 'settled') {
        done = true
        stop?.()
        resolve(update.result)
      } else if (update.status === 'failed') {
        done = true
        stop?.()
        reject(update.error ?? new Error('Payment failed'))
      }
    })
    stop = unsubscribe
    if (done) unsubscribe()
  })

/** Quoting lazily already removes the stale quote behind the wrong-address bug.
 *  This is the belt to that braces — a rail may quote worse than advertised. */
export const quoteIsForThisSend = (
  quote: Pick<RouteQuote, 'amount' | 'total'>,
  screen: { destination?: string; satoshis?: number; total?: number },
  routedAddress: string,
): boolean =>
  screen.destination === routedAddress && quote.amount === screen.satoshis && quote.total <= (screen.total ?? 0)
