/**
 * The wallet's boundary onto the Arkade RFQ swap client — the send leg of
 * `arkade:BTC -> lightning:BTC`.
 *
 * Two jobs, both of which belong to the wallet rather than the swap client:
 *
 * 1. Turn a user-supplied BOLT11 string into the `InvoiceFacts` the client
 *    requires, rejecting invoices the wallet can already prove unusable. The
 *    client gates on expiry too, but it can only do so because the wallet hands
 *    it an ABSOLUTE `expiresAt` — BOLT11 encodes expiry as a delta from the
 *    invoice's creation time, so that field only exists thanks to the decoder
 *    exposing `timestamp` (see `bolt11.ts`).
 * 2. Map the RFQ lifecycle onto the four states this wallet's swap history
 *    renders. The two vocabularies do not line up and are owned by different
 *    codebases, so the mapping is explicit here rather than assumed to match.
 *
 * Everything the swap client itself does — deriving the lockup covenant
 * locally, refusing to fund on an address mismatch, gating on `valid_until`
 * and refund headroom — stays in the client. This file adds no policy of its
 * own beyond the checks above.
 *
 * The client comes from `@arkade-os/swap`, which this wallet takes straight
 * from the ts-sdk monorepo until that package is published to npm.
 */
import { sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import type { NetworkName } from '@arkade-os/sdk'
import { RFQ_TERMINAL_STATES, requestLightningSend, type InvoiceFacts, type RfqTransport } from '@arkade-os/swap'
import { sleep as defaultSleep } from './sleep'
import { decodeInvoice, invoiceMatchesNetwork, isInvoiceExpired, type DecodedInvoice } from './bolt11'

/** Why an invoice cannot start a swap. A closed set, so callers can branch. */
export type InvoiceRejection = 'unparseable' | 'wrong_network' | 'expired' | 'zero_amount' | 'no_payment_hash'

/** An invoice the wallet refuses before any solver is contacted. */
export class InvoiceRejected extends Error {
  readonly reason: InvoiceRejection

  constructor(reason: InvoiceRejection, message: string) {
    super(message)
    this.name = 'InvoiceRejected'
    this.reason = reason
  }
}

/**
 * Decode a BOLT11 string into the facts the swap client needs, refusing
 * anything the wallet can already tell is unusable.
 *
 * These checks are deliberately local: contacting a solver with an invoice
 * that cannot be paid burns a quote and leaks the invoice to a third party for
 * nothing. The wrong-network check matters most — an invoice for another chain
 * is not merely unpayable here, it would be quoted against the wrong asset.
 */
export const toInvoiceFacts = (
  invoice: string,
  network: NetworkName,
  nowSeconds = Math.floor(Date.now() / 1000),
): InvoiceFacts => {
  let decoded: DecodedInvoice
  try {
    decoded = decodeInvoice(invoice)
  } catch {
    throw new InvoiceRejected('unparseable', 'not a valid BOLT11 invoice')
  }

  if (!invoiceMatchesNetwork(decoded, network)) {
    throw new InvoiceRejected('wrong_network', `invoice is not for ${network}`)
  }
  // isInvoiceExpired treats a missing timestamp as expired: an invoice whose
  // liveness cannot be proven must not be paid.
  if (isInvoiceExpired(decoded, nowSeconds)) {
    throw new InvoiceRejected('expired', 'invoice has expired')
  }
  // The lockup amount IS the invoice amount, so a zero-amount (donation)
  // invoice has nothing to fund and the solver cannot quote it.
  if (decoded.amountSats <= 0) {
    throw new InvoiceRejected('zero_amount', 'invoice does not specify an amount')
  }
  if (!decoded.paymentHash) {
    throw new InvoiceRejected('no_payment_hash', 'invoice carries no payment hash')
  }

  return {
    raw: invoice,
    paymentHash: decoded.paymentHash,
    amountSats: decoded.amountSats,
    expiresAt: decoded.expiresAt,
  }
}

/** Whether an RFQ state is one after which nothing further will happen. */
export const isRfqTerminal = (state: string): boolean => (RFQ_TERMINAL_STATES as readonly string[]).includes(state)

/**
 * The Lightning-send rendezvous, discovered rather than configured: which
 * solver to address (pubkey), where (relays), and the card's quoted bounds.
 *
 * There is deliberately no URL here. The RFQ protocol addresses solvers by
 * x-only pubkey over relays, both sides outbound-only, so a fleet of solvers
 * is a card change, not a config change.
 */
export interface LnSendRendezvous {
  solverPubkey: string
  relays: string[]
  /** Card bounds on the Lightning side, sats. Indicative; the quote binds. */
  minSats: number
  maxSats: number
}

/**
 * Pick the Lightning-send rendezvous out of discovered markets.
 *
 * A corridor market's card MUST carry `discovery_pubkey` and `relays` (they
 * are the rendezvous, and the registry signs them); a corridor market that
 * reaches us without them is malformed and skipped rather than trusted.
 * Returns undefined when no solver serves the corridor — the caller treats
 * that as "RFQ send unavailable", not as an error.
 */
export const lnSendRendezvous = (markets: DiscoveredMarket[]): LnSendRendezvous | undefined => {
  for (const market of markets) {
    if (market.quote_corridor !== 'lightning') continue
    if (!market.discovery_pubkey || !market.relays?.length) continue
    // sideLimits is the registry's own parser: it reads a disabled side
    // (max "0") or a malformed bound as null. Parsing the raw strings here
    // instead would turn a disabled side into a 0..0 range and report it to
    // the user as "amount outside solver bounds" rather than "no solver".
    const bounds = sideLimits(market, 'quote')
    if (!bounds) continue
    return {
      solverPubkey: market.discovery_pubkey,
      relays: market.relays,
      minSats: Number(bounds.min),
      maxSats: Number(bounds.max),
    }
  }
  return undefined
}

/**
 * What the send flow needs in order to pay: an address the wallet derived
 * itself and an amount. Deliberately no swap object to "execute" later —
 * see `requestLnSend`.
 */
export interface LnSendRequest {
  /** Negotiation id, for correlating status lookups. */
  rfqId: string
  /** The wallet's OWN derivation of the lockup covenant. Fund only this. */
  address: string
  /** Sats the lockup must carry. */
  fundAmount: number
  /** Unix seconds after which the quote is dead and must not be funded. */
  validUntil: number
  /**
   * Where to reach the solver again after funding.
   *
   * Carried on the request because settlement is not observable from the
   * funding transaction: the Ark txid only proves the covenant is funded, and
   * whether the invoice actually got paid is a question only the solver can
   * answer. Status lookups are keyed by `rfqId` alone and need no
   * authentication, so a fresh transport can ask — the negotiating one does
   * not have to be kept alive across screens.
   */
  rendezvous: LnSendRendezvous
}

/**
 * Negotiate a Lightning-send quote and return what the caller must fund.
 *
 * This performs no payment. That is the point of the design rather than an
 * omission: there is no accept message in the protocol, so **funding the
 * returned address IS acceptance**. The caller pays it with an ordinary Ark
 * send, which is why the send flow needs no swap-specific execute step.
 *
 * The address returned is the wallet's own derivation, not the solver's claim
 * of one; the client refuses (`AddressMismatch`) rather than returning a
 * mismatched address, so funding it cannot pay a solver-chosen script.
 *
 * `transport` is injected so the send flow can be tested without a solver, and
 * so switching from HTTP to a relay — or to Nostr, the stated production
 * target — changes only the caller.
 */
export const requestLnSend = async (
  args: {
    wallet: Parameters<typeof requestLightningSend>[0]
    arkServerUrl: string
    emulatorUrl: string
    transport: RfqTransport
    invoice: string
    network: NetworkName
    rendezvous: LnSendRendezvous
  },
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<LnSendRequest> => {
  const invoice = toInvoiceFacts(args.invoice, args.network, nowSeconds)
  const result = await requestLightningSend(args.wallet, args.arkServerUrl, args.emulatorUrl, args.transport, {
    invoice,
  })
  return {
    rfqId: result.rfqId,
    address: result.address,
    fundAmount: result.fundAmount,
    validUntil: result.quote.valid_until,
    rendezvous: args.rendezvous,
  }
}

/** How a funded Lightning send ended, from the wallet's point of view. */
export type LnSendOutcome =
  /** The solver paid the invoice and claimed. The only success. */
  | { kind: 'settled' }
  /** Terminal, but not paid. `state` is the RFQ state that ended it. */
  | { kind: 'failed'; state: string }
  /** Still in flight when we stopped waiting — NOT a failure. */
  | { kind: 'pending' }

/**
 * Watch a funded send until the solver reaches a terminal state.
 *
 * Funding is acceptance, not completion: at the moment the funding txid lands,
 * the invoice has not been paid yet. Treating that txid as success would tell
 * the user "Sent" while the payment may still fail — after which the covenant
 * refunds and their balance quietly returns. So the wallet asks the solver.
 *
 * Giving up is deliberately NOT a failure. The covenant is funded either way
 * and the refund path is unconditional, so an unanswered poll means "unknown",
 * which the caller must present as still-in-flight rather than as an error.
 *
 * Polls rather than subscribes: the solver pushes nothing, so status is a
 * request/response either way, and polling keeps the state here rather than in
 * a subscription that has to survive a screen change.
 */
export const awaitLnSendOutcome = async (
  rfqId: string,
  transport: RfqTransport,
  options: { timeoutMs?: number; pollMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<LnSendOutcome> => {
  const timeoutMs = options.timeoutMs ?? 90_000
  const pollMs = options.pollMs ?? 3_000
  const now = options.now ?? (() => Date.now())
  const sleep = options.sleep ?? defaultSleep
  const deadline = now() + timeoutMs

  for (;;) {
    // A failed lookup is not a verdict: the solver may be restarting, and the
    // covenant is funded regardless. Keep asking until the deadline.
    const status = await transport.status(rfqId).catch(() => null)
    const state = status?.state
    if (state === 'settled') return { kind: 'settled' }
    if (state && isRfqTerminal(state)) return { kind: 'failed', state }
    if (now() >= deadline) return { kind: 'pending' }
    await sleep(pollMs)
  }
}
