/**
 * The send path's `PaymentRouter`. The fallback is not written here: a rail whose
 * `available()` returns false or throws is dropped from `options()` without
 * taking the router with it, replacing a six-case refusal enum. Amounts are
 * receiver-exact; the screen translates from "what leaves" at the boundary,
 * which keeps "send max" working.
 */
import {
  PaymentRouter,
  makeHandle,
  type IWallet,
  type NetworkName,
  type PaymentRail,
  type RouteQuote,
} from '@arkade-os/sdk'
import { SOLVER_ONCHAIN_RAIL, solverOnchainRail, type OnchainNetwork, type SolverOnchainSend } from '@arkade-os/swap'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { collaborativeExitWithFees } from './asp'
import { l1NetworkOf, l1PayoutPubkey, onchainClaimEndpoint } from './onchainPayout'
import { withRfqTransport } from './nostrRfq'
import { discoverMarkets } from './swapMarkets'
import { getEmulatorPubkeyForNetwork, getEmulatorPubkeyOverrideForNetwork } from './constants'

export const WALLET_EXIT_RAIL = 'onchain'

export const ONCHAIN_ROUTE_LOG = 'onchain send:'

/** Not the SDK's `onchainRail`: that offboards with its own coin selection. */
export const walletExitRail = (deps: { outputFee: () => number }): PaymentRail => ({
  id: WALLET_EXIT_RAIL,
  match: (req) => Boolean(req.raw),
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

export interface SendRouterDeps {
  wallet: IWallet
  arkServerUrl: string
  network: NetworkName
  outputFee: () => number
  persist: (swap: SolverOnchainSend) => Promise<void>
  payoutPubkey: Uint8Array
  discover?: (network: NetworkName) => Promise<DiscoveredMarket[]>
}

/** No L1 endpoint, no solver rail: it would fund an HTLC it can never open. */
export const createSendRouter = (deps: SendRouterDeps): PaymentRouter => {
  const router = new PaymentRouter({
    // Typed as concrete `Wallet`; an `IWallet` satisfies what the rails call.
    wallet: deps.wallet as unknown as ConstructorParameters<typeof PaymentRouter>[0]['wallet'],
    prefs: { priority: [SOLVER_ONCHAIN_RAIL, WALLET_EXIT_RAIL] },
  })

  if (onchainClaimEndpoint(deps.network)) {
    const discover = deps.discover ?? discoverMarkets
    router.use(
      solverOnchainRail({
        arkServerUrl: deps.arkServerUrl,
        l1Network: l1NetworkOf(deps.network) as OnchainNetwork,
        payoutPubkey: deps.payoutPubkey,
        discover: () => discover(deps.network),
        connect: (rendezvous, fn) => withRfqTransport(rendezvous, fn),
        persist: deps.persist,
        ...(getEmulatorPubkeyOverrideForNetwork(deps.network)
          ? { emulatorPubkey: getEmulatorPubkeyOverrideForNetwork(deps.network)! }
          : {}),
        ...(getEmulatorPubkeyForNetwork(deps.network)
          ? { fallbackEmulatorPubkey: getEmulatorPubkeyForNetwork(deps.network)! }
          : {}),
      }),
    )
  }

  return router.use(walletExitRail({ outputFee: deps.outputFee }))
}

/** Quoting lazily already removes the stale quote behind the wrong-address bug.
 *  This is the belt to that braces — a rail may quote worse than advertised. */
export const quoteIsForThisSend = (
  quote: Pick<RouteQuote, 'amount' | 'total'>,
  screen: { destination?: string; satoshis?: number; total?: number },
  routedAddress: string,
): boolean =>
  screen.destination === routedAddress && quote.amount === screen.satoshis && quote.total <= (screen.total ?? 0)

export { SOLVER_ONCHAIN_RAIL, l1PayoutPubkey }
