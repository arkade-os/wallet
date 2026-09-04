/**
 * The wallet's boundary onto the `arkade:BTC -> onchain:BTC` corridor — paying
 * an L1 address out of an Arkade balance through a solver instead of through a
 * collaborative exit.
 *
 * Two jobs, mirroring `lnSwap.ts` for the Lightning leg:
 *
 * 1. Pick the rendezvous out of the discovered markets, and refuse a card that
 *    serves the pair but not the SIZE. The two refusals are distinct values
 *    rather than one `undefined`, because the send flow has to say which one
 *    happened: "no solver serves this" and "no solver serves 4,000,000 sats"
 *    are different problems for the user, and both have to be visible when the
 *    wallet quietly does a collaborative exit instead.
 * 2. Negotiate the quote and hand back what the caller must fund.
 *
 * **The fallback is the whole point.** Every failure here — no card, a card
 * that cannot take the size, a refusal, a timeout, a quote that does not price
 * the trade the user asked for — is a reason to do the collaborative exit the
 * wallet has always done, never a reason to fail the payment. So nothing in
 * this file decides that; it reports, and `Form.tsx` chooses. What must NOT
 * happen is a silent swallow, which is why the reasons are a closed set.
 *
 * Everything the swap client itself does — deriving BOTH contracts locally,
 * refusing a lockup address it did not derive, the `assertFundable` gates on
 * the timelock order and the L1 claim window — stays in `@arkade-os/swap`.
 */
import { hex } from '@scure/base'
import { marketCorridor, sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { l1ScriptForAddress } from './onchainPayout'
import {
  requestOnchainSend,
  type OnchainHtlc,
  type OnchainHtlcParams,
  type OnchainNetwork,
  type RfqTransport,
} from '@arkade-os/swap'
import type { OnchainSendRecordFacts } from './onchainSendRecords'

/**
 * Where to reach the solver for an onchain send, and the bounds its card
 * advertises. Structurally the same as `LnSendRendezvous` — deliberately, so
 * `withRfqTransport` takes either — but kept as its own type because the
 * corridor it names is different.
 */
export interface OnchainSendRendezvous {
  solverPubkey: string
  transports: { nostr: { relays: string[] } }
  /** The card's `emulator_pubkey`, x-only hex. See `lnSwap.ts` for why the
   * covenant cannot be derived without it. */
  emulatorPubkey: string
  /** Card bounds on the onchain side, sats. Indicative; the quote binds. */
  minSats: number
  maxSats: number
}

/**
 * Why the solver route was not taken. A closed set so the caller can branch,
 * and so the log line that explains a collaborative exit is a value rather
 * than a string someone has to keep in sync.
 */
export type OnchainRouteRefusal =
  /** No discovered card advertises `arkade:BTC -> onchain:BTC` at all. */
  | 'no_solver'
  /** A card serves the pair, but not at this size. */
  | 'amount_out_of_bounds'
  /**
   * This wallet has no Bitcoin-L1 endpoint for the network, so it could not
   * watch or claim the fill the solver would make. Checked BEFORE quoting: a
   * funded HTLC nobody opens is worse than a collaborative exit, and the
   * whole point of the fallback is that the wallet never gets into that state.
   */
  | 'no_l1_endpoint'
  /**
   * The destination is an L1 address this wallet cannot build an output for,
   * so the claim would have nowhere to pay. Also checked before quoting.
   */
  | 'unsupported_address'
  /** Market discovery itself failed — an unreachable registry, a bad cache. */
  | 'discovery_failed'
  /** The negotiation failed: a refusal, a timeout, a quote we would not fund. */
  | 'quote_failed'

/** The solver route is unavailable, and the caller should exit collaboratively. */
export class OnchainRouteUnavailable extends Error {
  readonly reason: OnchainRouteRefusal
  /** The bounds that rejected the amount, when that is what happened. */
  readonly bounds?: { minSats: number; maxSats: number }

  constructor(
    reason: OnchainRouteRefusal,
    message: string,
    options?: { bounds?: OnchainRouteUnavailable['bounds']; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'OnchainRouteUnavailable'
    this.reason = reason
    this.bounds = options?.bounds
  }
}

/**
 * The prefix every routing decision is logged under.
 *
 * A constant because it is the ONLY trace of a choice the user never sees: an
 * exit that fell back looks exactly like an exit that was always going to be
 * collaborative. Exported so the e2e test asserts on the same string the code
 * writes rather than a copy of it.
 */
export const ONCHAIN_ROUTE_LOG = 'onchain send:'

/** 64 lowercase hex chars — the registry's own `emulator_pubkey` pattern. */
const XONLY_HEX = /^[0-9a-f]{64}$/

/** What a market's card must carry before it can be a rendezvous, resolved
 * under the same rules the Lightning corridor uses (see `lnSwap.ts`): the
 * card's own `emulator_pubkey` wins, an absent one falls back to the pinned
 * per-network key, a malformed one fails closed even with a pin, and a
 * disagreement between the two is skipped rather than resolved. */
const rendezvousOf = (market: DiscoveredMarket, pinned?: string): OnchainSendRendezvous | undefined => {
  const transports = { nostr: { relays: market.transports?.nostr?.relays ?? [] } }
  if (!market.discovery_pubkey || !transports.nostr.relays.length) return undefined

  const advertised = (market as { emulator_pubkey?: unknown }).emulator_pubkey
  const emulatorPubkey =
    advertised === undefined || advertised === null || advertised === ''
      ? pinned
      : typeof advertised === 'string' && XONLY_HEX.test(advertised)
        ? advertised
        : undefined
  if (!emulatorPubkey) return undefined
  if (pinned && emulatorPubkey !== pinned) return undefined

  // A side's bounds are what the SOLVER pays out on it, so the send leg —
  // arkade in, L1 out — is bounded by the quote (onchain) side. `sideLimits`
  // is the registry's own parser and reads a disabled side (max "0") or a
  // malformed bound as null, which is what keeps a disabled corridor from
  // reaching the user as "amount outside solver bounds".
  const bounds = sideLimits(market, 'quote')
  if (!bounds) return undefined

  return {
    solverPubkey: market.discovery_pubkey,
    transports,
    emulatorPubkey,
    minSats: Number(bounds.min),
    maxSats: Number(bounds.max),
  }
}

/**
 * Pick the onchain-send rendezvous for THIS amount.
 *
 * The size check is not a courtesy. A card advertises the range its solver can
 * actually fill, and quoting outside it burns a negotiation, tells a third
 * party what the user is about to do, and comes back as `amount_out_of_range`
 * anyway — so a card that serves the pair but not the size must not be
 * selected. It is skipped, not fatal: another card may take the size, and only
 * when none does is `amount_out_of_bounds` reported, carrying the widest range
 * seen so the caller can say what would have fitted.
 *
 * Returns a refusal rather than throwing, because "no solver" is the ordinary
 * case for a wallet with no cards and the ordinary case must not be an error.
 */
export const onchainSendRendezvous = (
  markets: DiscoveredMarket[],
  amountSats: number,
  fallbackEmulatorPubkey?: Uint8Array,
):
  | { ok: true; rendezvous: OnchainSendRendezvous }
  | { ok: false; reason: 'no_solver' }
  | { ok: false; reason: 'amount_out_of_bounds'; bounds: { minSats: number; maxSats: number } } => {
  const pinned = fallbackEmulatorPubkey ? hex.encode(fallbackEmulatorPubkey) : undefined
  let widest: { minSats: number; maxSats: number } | undefined

  for (const market of markets) {
    // The send leg goes arkade -> L1: anything else on the base side is a
    // corridor this wallet cannot fund from, and the receive direction lives
    // on the other side of the same market.
    if (marketCorridor(market, 'base') !== 'arkade') continue
    if (marketCorridor(market, 'quote') !== 'onchain') continue

    const rendezvous = rendezvousOf(market, pinned)
    if (!rendezvous) continue

    const { minSats, maxSats } = rendezvous
    if (amountSats >= minSats && amountSats <= maxSats) return { ok: true, rendezvous }

    // Serves the pair, not the size. Remember the range so the caller can name
    // one, preferring the widest on offer.
    if (!widest || maxSats - minSats > widest.maxSats - widest.minSats) widest = { minSats, maxSats }
  }

  if (widest) return { ok: false, reason: 'amount_out_of_bounds', bounds: widest }
  return { ok: false, reason: 'no_solver' }
}

/**
 * What the send flow needs in order to pay. Deliberately no swap object to
 * "execute" later: funding the address IS acceptance, exactly as on the
 * Lightning leg.
 */
export interface OnchainSendRequest {
  /** Negotiation id, for correlating status lookups. */
  rfqId: string
  /**
   * The L1 address this quote was negotiated FOR.
   *
   * Carried so the quote can be checked against the send it is about to pay,
   * which is the whole of {@link onchainQuoteMatches}. A quote is a fact about
   * one destination and one amount; the screen it was requested from can be
   * navigated away from, edited, and returned to, and nothing about the quote
   * itself would look wrong afterwards.
   */
  payoutAddress: string
  /** The wallet's OWN derivation of the Arkade lockup. Fund only this. */
  address: string
  /** Sats the lockup must carry — what LEAVES the wallet. */
  fundAmount: number
  /**
   * Sats the solver puts INTO the L1 HTLC — the quote's `to_amount`.
   *
   * Not quite what the recipient nets: `buildHtlcClaim` pays the claim
   * transaction's fee out of this output, so they receive it less whatever the
   * fee rate is at claim time. That rate is not knowable now — the claim can be
   * hours away — so this is the honest number to show rather than a guess
   * dressed up as a total.
   */
  payoutAmount: number
  /** Unix seconds after which the quote is dead and must not be funded. */
  validUntil: number
  rendezvous: OnchainSendRendezvous
  /** What the record needs and nothing later can give back. */
  record: OnchainSendRecordFacts
  /** The expected L1 fill, for the claim this wallet must make. */
  htlc: OnchainHtlc
  htlcParams: OnchainHtlcParams
  l1Network: OnchainNetwork
  minConfirmations: number
}

/**
 * Negotiate an onchain-send quote and return what the caller must fund.
 *
 * `amountSide: 'from'` — the user types what leaves the wallet, which is how
 * this wallet has always priced an onchain send (the fee comes out of the
 * amount, see `Details.tsx`), so the solver route displays on the existing
 * screen without changing what the number means.
 *
 * Two checks the package does not make on this leg, both cheap and both about
 * paying more than the user agreed to:
 *
 * - the quote must price the trade that was ASKED for. `assertQuotedAmount` is
 *   applied on the receive legs only, so a send quote naming a different
 *   `from_amount` would otherwise be funded at the solver's number.
 * - it must actually deliver something. A quote whose payout is zero, negative
 *   or larger than the input is not one to fund.
 */
export const requestOnchainExit = async (args: {
  wallet: Parameters<typeof requestOnchainSend>[0]
  arkServerUrl: string
  transport: RfqTransport
  /** Sats to spend — `quote.from_amount` must come back equal to this. */
  amountSats: number
  /** The user's x-only L1 key that will AUTHORISE the claim. Never where it
   * pays: the HTLC's claim leaf binds a key this wallet must sign with, and
   * the recipient cannot. */
  payoutPubkey: Uint8Array
  /**
   * The RECIPIENT's output script — where the claim actually pays.
   *
   * Carried on the record because the claim happens later, possibly in another
   * process, long after this screen is gone. Nothing in the quote or on the
   * HTLC names it: the claim transaction's output is the spender's own choice,
   * which is exactly why it has to be pinned here rather than derived at claim
   * time from whatever is to hand.
   */
  payoutPkScript: Uint8Array
  /** The address {@link payoutPkScript} was derived from — carried onto the
   * request so a stored quote can say which send it belongs to. */
  payoutAddress: string
  rendezvous: OnchainSendRendezvous
  /** 33-byte compressed hex override for the covenant co-signer, when this
   * deployment pins one. Absent lets the package use its per-network pin. */
  emulatorPubkey?: string
}): Promise<OnchainSendRequest> => {
  const result = await requestOnchainSend(args.wallet, args.arkServerUrl, args.transport, {
    amount: args.amountSats,
    amountSide: 'from',
    payoutPubkey: args.payoutPubkey,
    ...(args.emulatorPubkey ? { emulatorPubkey: args.emulatorPubkey } : {}),
  })

  if (result.fundAmount !== args.amountSats) {
    throw new Error(`solver quoted ${result.fundAmount} sats in, not the requested ${args.amountSats}`)
  }
  const payoutAmount = result.quote.to_amount
  if (!Number.isInteger(payoutAmount) || payoutAmount <= 0 || payoutAmount >= result.fundAmount) {
    throw new Error(`solver quoted an unusable payout of ${String(payoutAmount)} sats`)
  }

  return {
    rfqId: result.rfqId,
    payoutAddress: args.payoutAddress,
    address: result.address,
    fundAmount: result.fundAmount,
    payoutAmount,
    validUntil: result.quote.valid_until,
    rendezvous: args.rendezvous,
    htlc: result.htlc,
    htlcParams: result.htlcParams,
    l1Network: result.l1Network,
    minConfirmations: result.minConfirmations,
    record: {
      paymentHash: result.htlcParams.paymentHash,
      // The ARKADE lockup's deadline, not the L1 HTLC's. Never actually
      // absent on this leg: `assertFundable`'s `direction: 'send'` branch
      // fails `timelock_order` on an undefined `refund_locktime`, so a quote
      // without one cannot reach here. The `?? 0` is the type narrowing that
      // fact needs, not a default anything is expected to take.
      refundLocktime: result.quote.refund_locktime ?? 0,
      secrets: result.secrets,
      script: result.script,
      payoutPkScript: args.payoutPkScript,
      htlc: result.htlc,
      htlcParams: result.htlcParams,
      l1Network: result.l1Network,
      minConfirmations: result.minConfirmations,
    },
  }
}

/**
 * Whether a stored quote is still the quote for THIS send.
 *
 * A quote binds one destination and one amount, and the screen it came from can
 * be left, edited and returned to — so "there is a quote in hand" is not the
 * same question as "this quote is for what the user is now about to send", and
 * treating them as one pays the previous recipient.
 *
 * The check lives here, next to the type, rather than at the call sites,
 * because there are two of them and they need different things from it: the
 * send form uses it to decide whether to re-quote, and the sign screen uses it
 * to refuse to fund. The second is what makes a wrong-address payment
 * impossible rather than merely unlikely — a send flow that forgets to clear a
 * stale quote (there are two dozen places that write this state) still cannot
 * spend one, because the screen that moves the money checks for itself.
 */
export const onchainQuoteMatches = (
  quote: Pick<OnchainSendRequest, 'payoutAddress' | 'fundAmount'>,
  send: { address?: string; satoshis?: number },
): boolean => quote.payoutAddress === send.address && quote.fundAmount === send.satoshis

/** The user-facing half of a refusal — what the send screen shows when it
 * quietly falls back. Kept beside the reasons so a new one cannot be added
 * without a message. */
export const onchainRouteRefusalText = (error: OnchainRouteUnavailable): string => {
  switch (error.reason) {
    case 'no_solver':
      return 'No solver serves onchain sends — using a collaborative exit'
    case 'amount_out_of_bounds':
      return error.bounds
        ? `Amount outside solver bounds (${error.bounds.minSats}-${error.bounds.maxSats} sats) — using a collaborative exit`
        : 'Amount outside solver bounds — using a collaborative exit'
    case 'no_l1_endpoint':
      return 'No Bitcoin endpoint for this network — using a collaborative exit'
    case 'unsupported_address':
      return 'Solver route cannot pay this address type — using a collaborative exit'
    case 'discovery_failed':
      return 'Could not reach the solver registry — using a collaborative exit'
    case 'quote_failed':
      return 'No usable solver quote — using a collaborative exit'
  }
}

/**
 * The whole solver route, as one decision: can a solver take this send, and if
 * so what must be funded.
 *
 * **Rejects with `OnchainRouteUnavailable` and nothing else.** Every step
 * inside — discovery, selection, the size check, the negotiation, the client's
 * own address and gate checks — is a way for the answer to be "no", and the
 * caller's response to all of them is identical: do the collaborative exit.
 * Collapsing them to one rejection type is what stops a new failure mode
 * inside `@arkade-os/swap` from escaping as an unhandled error and taking a
 * payment down that the wallet could always have made. The original is kept as
 * `cause` and the `reason` says which step, so the fallback is never silent.
 *
 * The seams (`discover`, `connect`) are injected for the same reason
 * `requestLnSend` takes its transport: the decision is testable without a
 * solver, a relay, or a registry.
 */
export const planOnchainSend = async (args: {
  wallet: Parameters<typeof requestOnchainSend>[0]
  arkServerUrl: string
  /** Sats to spend. Bound-checked before anything is asked of a solver. */
  amountSats: number
  payoutPubkey: Uint8Array
  /** The recipient's L1 address — the destination the user actually typed. */
  payoutAddress: string
  /** Which Bitcoin network that address must be spendable on. */
  l1Network: OnchainNetwork
  /** The L1 endpoint this wallet would claim the fill through, if it has one. */
  claimEndpoint?: string
  fallbackEmulatorPubkey?: Uint8Array
  emulatorPubkey?: string
  discover: () => Promise<DiscoveredMarket[]>
  connect: <T>(rendezvous: OnchainSendRendezvous, fn: (transport: RfqTransport) => Promise<T>) => Promise<T>
}): Promise<OnchainSendRequest> => {
  // First, and before any network call: a wallet that cannot claim on L1 must
  // not negotiate a swap whose claim is its own responsibility.
  if (!args.claimEndpoint) {
    throw new OnchainRouteUnavailable('no_l1_endpoint', 'no L1 endpoint is configured for this network')
  }
  // Resolved here, before anything is negotiated, because a destination the
  // claim cannot pay to makes the whole route pointless — and because the
  // record must carry it: the claim's output is not derivable from the quote,
  // the HTLC, or anything else that survives this screen.
  let payoutPkScript: Uint8Array
  try {
    payoutPkScript = l1ScriptForAddress(args.payoutAddress, args.l1Network)
  } catch (cause) {
    throw new OnchainRouteUnavailable('unsupported_address', `cannot build an output for ${args.payoutAddress}`, {
      cause,
    })
  }

  let markets: DiscoveredMarket[]
  try {
    markets = await args.discover()
  } catch (cause) {
    throw new OnchainRouteUnavailable('discovery_failed', 'market discovery failed', { cause })
  }

  const choice = onchainSendRendezvous(markets, args.amountSats, args.fallbackEmulatorPubkey)
  if (!choice.ok) {
    if (choice.reason === 'amount_out_of_bounds') {
      throw new OnchainRouteUnavailable(
        'amount_out_of_bounds',
        `${args.amountSats} sats is outside the solver's ${choice.bounds.minSats}-${choice.bounds.maxSats} range`,
        { bounds: choice.bounds },
      )
    }
    throw new OnchainRouteUnavailable('no_solver', 'no solver advertises arkade:BTC -> onchain:BTC')
  }

  try {
    return await args.connect(choice.rendezvous, (transport) =>
      requestOnchainExit({
        wallet: args.wallet,
        arkServerUrl: args.arkServerUrl,
        transport,
        amountSats: args.amountSats,
        payoutPubkey: args.payoutPubkey,
        payoutPkScript,
        payoutAddress: args.payoutAddress,
        rendezvous: choice.rendezvous,
        ...(args.emulatorPubkey ? { emulatorPubkey: args.emulatorPubkey } : {}),
      }),
    )
  } catch (cause) {
    throw new OnchainRouteUnavailable('quote_failed', quoteFailureMessage(cause), { cause })
  }
}

/**
 * Name the negotiation failure without inventing one.
 *
 * `SwapRefusal` carries a closed-set `reason` and every gate in the package
 * throws `Error & { reason }`, so the reason code is what to report — the
 * message is prose that changes. Anything else keeps its own message, which is
 * what a transport timeout and an address mismatch both rely on.
 */
const quoteFailureMessage = (cause: unknown): string => {
  const reason = (cause as { reason?: unknown } | null)?.reason
  if (typeof reason === 'string' && reason) return `solver route refused: ${reason}`
  return cause instanceof Error && cause.message ? cause.message : 'the solver quote could not be used'
}
