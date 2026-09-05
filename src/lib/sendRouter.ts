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
  type NetworkName,
  type PaymentRail,
  type RouteQuote,
} from '@arkade-os/sdk'
import { SOLVER_ONCHAIN_RAIL, solverOnchainRail, type OnchainNetwork, type SolverOnchainSend } from '@arkade-os/swap'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { collaborativeExitWithFees, sendAssets, sendOffChain } from './asp'
import { l1NetworkOf, l1PayoutPubkey } from './onchainPayout'
import { lnSendRendezvous, requestLnSend } from './lnSwap'
import type { LnSendRecordInput } from './lnSendRecords'
import { withRfqTransport } from './nostrRfq'
import { prettyNumber } from './format'
import { consoleError } from './logs'
import { discoverMarkets } from './swapMarkets'
import { defaultFee, getEmulatorPubkeyForNetwork, getEmulatorPubkeyOverrideForNetwork } from './constants'

export const WALLET_EXIT_RAIL = 'onchain'

export const LIGHTNING_RAIL = 'lightning'

export const ASSET_RAIL = 'asset'

export const ONCHAIN_ROUTE_LOG = 'onchain send:'

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
          const txid = await collaborativeExitWithFees(ctx.wallet as unknown as IWallet, total, amount, req.raw)
          const result = { railId: WALLET_EXIT_RAIL, txid }
          emit({ status: 'settled', result })
          return result
        }),
    }
  },
})

export interface LightningRailDeps {
  arkServerUrl: string
  network: NetworkName
  discover: () => Promise<DiscoveredMarket[]>
  track: (input: LnSendRecordInput) => Promise<void>
}

/** Not the SDK's `solverLightningRail`: that persists BEFORE funding and its
 *  result carries no txid, and the funding txid is what the history row and the
 *  activity grouping key on. Picks the solver with the same `lnSendRendezvous`
 *  the send form used before routing. */
export const lightningRail = (deps: LightningRailDeps): PaymentRail => {
  const rendezvousFor = async (sats: number) => {
    const found = lnSendRendezvous(await deps.discover(), getEmulatorPubkeyForNetwork(deps.network))
    return found && sats >= found.minSats && sats <= found.maxSats ? found : undefined
  }
  return {
    id: LIGHTNING_RAIL,
    match: (req) => invoiceTarget(req.raw) !== undefined,
    // Deliberately no decode: an expired or wrong-chain invoice must reach
    // `requestLnSend`, whose `InvoiceRejected` names the reason. A rail that
    // dropped itself here would report every one of them as "no solver".
    available: async (req) => ((req.amount ?? 0) > 0 ? (await rendezvousFor(req.amount!)) !== undefined : false),
    quote: async (req, ctx) => {
      const invoice = invoiceTarget(req.raw)!
      const rendezvous = await rendezvousFor(req.amount!)
      if (!rendezvous) throw new Error(`${LIGHTNING_RAIL}: no solver serves arkade:BTC -> lightning:BTC`)
      const request = await withRfqTransport(rendezvous, (transport) =>
        requestLnSend({
          wallet: ctx.wallet as unknown as IWallet,
          arkServerUrl: deps.arkServerUrl,
          transport,
          invoice,
          network: deps.network,
          rendezvous,
        }),
      )
      return {
        railId: LIGHTNING_RAIL,
        amount: req.amount!,
        fee: request.fundAmount - req.amount!,
        total: request.fundAmount,
        meta: { rfqId: request.rfqId, invoice, validUntil: request.validUntil },
        send: async () =>
          makeHandle(LIGHTNING_RAIL, async (emit) => {
            if (Math.floor(Date.now() / 1000) >= request.validUntil) {
              throw new Error('Quote expired — go back and try again')
            }
            const txid = await sendOffChain(ctx.wallet as unknown as IWallet, request.fundAmount, request.address)
            if (!txid) throw new Error('Error sending transaction')
            emit({ status: 'sent' })
            // Reported, not raised: funding IS acceptance, so a store that
            // refuses leaves the payment committed either way.
            await deps
              .track({
                rfqId: request.rfqId,
                lockupAddress: request.address,
                amount: request.fundAmount,
                fundingTxid: txid,
                ...request.record,
              })
              .catch((err) => consoleError(err, 'error tracking lightning send'))
            const result = { railId: LIGHTNING_RAIL, txid, swapId: request.rfqId }
            emit({ status: 'settled', result })
            return result
          }),
      }
    },
  }
}

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
        const txid = await sendAssets(ctx.wallet as unknown as IWallet, arkTarget(req.raw)!, deps.assets)
        const result = { railId: ASSET_RAIL, txid }
        emit({ status: 'settled', result })
        return result
      }),
  }),
})

/** Optional per-corridor deps: a rail whose deps are absent is not registered,
 *  which is the drop `available()` performs, one step earlier. */
export interface SendRouterDeps {
  wallet: IWallet
  arkServerUrl: string
  network: NetworkName
  outputFee?: () => number
  persist?: (swap: SolverOnchainSend) => Promise<void>
  payoutPubkey?: Uint8Array
  track?: LightningRailDeps['track']
  assets?: Asset[]
  discover?: (network: NetworkName) => Promise<DiscoveredMarket[]>
}

/** The solver rail is registered on every network now `ESPLORA_URL` is total;
 *  `available()` drops it. */
export const createSendRouter = (deps: SendRouterDeps): PaymentRouter => {
  const router = new PaymentRouter({
    // Typed as concrete `Wallet`; an `IWallet` satisfies what the rails call.
    wallet: deps.wallet as unknown as ConstructorParameters<typeof PaymentRouter>[0]['wallet'],
    prefs: { priority: [SOLVER_ONCHAIN_RAIL, WALLET_EXIT_RAIL, LIGHTNING_RAIL, ASSET_RAIL] },
  })

  const discover = deps.discover ?? discoverMarkets
  if (deps.payoutPubkey && deps.persist) {
    const payoutPubkey = deps.payoutPubkey
    const persist = deps.persist
    router.use(
      solverOnchainRail({
        arkServerUrl: deps.arkServerUrl,
        l1Network: l1NetworkOf(deps.network) as OnchainNetwork,
        payoutPubkey,
        discover: () => discover(deps.network),
        connect: (rendezvous, fn) => withRfqTransport(rendezvous, fn),
        persist,
        ...(getEmulatorPubkeyOverrideForNetwork(deps.network)
          ? { emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(deps.network)! }
          : {}),
        ...(getEmulatorPubkeyForNetwork(deps.network)
          ? { fallbackEmulatorPubkey: getEmulatorPubkeyForNetwork(deps.network)! }
          : {}),
      }),
    )
  }
  if (deps.outputFee) router.use(walletExitRail({ outputFee: deps.outputFee }))
  if (deps.track) {
    router.use(
      lightningRail({
        arkServerUrl: deps.arkServerUrl,
        network: deps.network,
        discover: () => discover(deps.network),
        track: deps.track,
      }),
    )
  }
  if (deps.assets) router.use(assetRail({ assets: deps.assets }))
  return router
}

/** Why the Lightning rail dropped itself: `options()` reports absence, not
 *  cause, and the send form told these two apart before routing. */
export const lnSendRefusal = (markets: DiscoveredMarket[], network: NetworkName): string => {
  const found = lnSendRendezvous(markets, getEmulatorPubkeyForNetwork(network))
  return found
    ? `Amount outside solver bounds (${prettyNumber(found.minSats)}-${prettyNumber(found.maxSats)} sats)`
    : 'No Lightning solver available'
}

/** The Lightning analogue of {@link quoteIsForThisSend}. */
export const quoteIsForThisInvoice = (quote: Pick<RouteQuote, 'meta'>, invoice: string): boolean =>
  quote.meta?.invoice === invoice

/** Quoting lazily already removes the stale quote behind the wrong-address bug.
 *  This is the belt to that braces — a rail may quote worse than advertised. */
export const quoteIsForThisSend = (
  quote: Pick<RouteQuote, 'amount' | 'total'>,
  screen: { destination?: string; satoshis?: number; total?: number },
  routedAddress: string,
): boolean =>
  screen.destination === routedAddress && quote.amount === screen.satoshis && quote.total <= (screen.total ?? 0)

export { SOLVER_ONCHAIN_RAIL, l1PayoutPubkey }
