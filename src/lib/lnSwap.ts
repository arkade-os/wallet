/**
 * The wallet's boundary onto the Lightning corridor — what stays this side of
 * `createSwapClient` because the client cannot infer it.
 *
 * Two jobs:
 *
 * 1. Turn a BOLT11 string into the `InvoiceFacts` the corridor requires,
 *    rejecting invoices the wallet can already prove unusable. The client gates
 *    on expiry too, but it can only do so because this hands it an ABSOLUTE
 *    `expiresAt` — BOLT11 encodes expiry as a delta from the invoice's creation
 *    time, so that field only exists thanks to the decoder exposing `timestamp`
 *    (see `bolt11.ts`). The same function is the client's `decodeInvoice`, so
 *    the payer's invoice on a send and the solver's hold invoice on a receive
 *    pass the same gates.
 * 2. Pick which discovered market is the corridor, in each direction, and carry
 *    the card's amount bounds — the check that keeps an out-of-range amount from
 *    burning a quote, and the co-signer cross-check the client does not make.
 *
 * Everything the client itself does — deriving the lockup covenant locally,
 * refusing to fund on an address mismatch, gating on `valid_until` and refund
 * headroom, funding, watching, claiming and refunding — stays in the client.
 */
import { hex } from '@scure/base'
import { sideLimits, type DiscoveredMarket, type Side } from '@arkade-os/solver-discovery'
import type { NetworkName, RestIndexerProvider } from '@arkade-os/sdk'
import type { InvoiceFacts } from '@arkade-os/swap'
import { decodeInvoice, invoiceMatchesNetwork, isInvoiceExpired, type DecodedInvoice } from './bolt11'
import { rfqRendezvousOf } from './nostrRfq'

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

/**
 * The Lightning corridor as the client needs it: which market to quote against,
 * and the card's own bounds on the amount.
 *
 * There is deliberately no URL and no transport here. The RFQ protocol
 * addresses solvers by x-only pubkey over relays, both sides outbound-only, so
 * a fleet of solvers is a card change; and the client builds the transport from
 * the market itself through `transportFor`.
 */
export interface LnCorridor {
  /** The market to hand `client.quote`. */
  market: DiscoveredMarket
  /** Card bounds on the Lightning side, sats. Indicative; the quote binds. */
  minSats: number
  maxSats: number
}

/** 64 lowercase hex chars — the registry's own `emulator_pubkey` pattern. */
const XONLY_HEX = /^[0-9a-f]{64}$/

/**
 * Pick the Lightning-send corridor out of discovered markets.
 *
 * A corridor market's card MUST carry `discovery_pubkey`, a nostr transport
 * (they are the rendezvous, and the registry signs them) and `emulator_pubkey`;
 * a corridor market that reaches us without them is malformed and skipped
 * rather than trusted. Returns undefined when no solver serves the corridor —
 * the caller treats that as "RFQ send unavailable", not as an error.
 *
 * The co-signer key must be RIGHT, not merely present: the covenant is derived
 * from the key the CLIENT is configured with (the wallet's pin, or the
 * package's own per-network one), so a card naming a different key means the
 * solver will fill a covenant at a different address than the one this wallet
 * would fund, and `verifyLockupAddress` refuses after a quote was burned and
 * the invoice was handed to a third party. So the card's value is never used to
 * derive — it is compared:
 *
 *  - absent, the card predates the field and `fallbackEmulatorPubkey`, the
 *    per-network value pinned in `constants.ts` (or set through
 *    `VITE_EMULATOR_PUBKEY`), is what the client will derive with anyway;
 *  - present and equal to the pin, the two agree and there is nothing to do;
 *  - present and DIFFERENT, the market is skipped rather than resolved in
 *    either direction — that is a solver rotating its co-signer or a card being
 *    served by someone else, and neither is a thing to pick a winner for
 *    silently;
 *  - present but malformed is a corrupt or hostile card, and falls closed even
 *    with a pin, because falling back there would paper over it.
 *
 * Passing no fallback keeps the strict behaviour: no card key, no corridor.
 */
export const lnSendCorridor = (
  markets: DiscoveredMarket[],
  fallbackEmulatorPubkey?: Uint8Array,
): LnCorridor | undefined => lnCorridor(markets, 'quote', fallbackEmulatorPubkey)

/**
 * The receive direction of the same market.
 *
 * A side's bounds are what the SOLVER pays out on it, so the Lightning corridor's
 * two directions live on the two sides of one market: quote (Lightning) is the
 * send leg, base (arkade) the receive leg. A card whose base side is disabled
 * advertises no receive corridor, which is the current published state — see
 * arkade-os/lightning-swap-service#64.
 */
export const lnReceiveCorridor = (
  markets: DiscoveredMarket[],
  fallbackEmulatorPubkey?: Uint8Array,
): LnCorridor | undefined => lnCorridor(markets, 'base', fallbackEmulatorPubkey)

const lnCorridor = (
  markets: DiscoveredMarket[],
  side: Side,
  fallbackEmulatorPubkey?: Uint8Array,
): LnCorridor | undefined => {
  const pinned = fallbackEmulatorPubkey ? hex.encode(fallbackEmulatorPubkey) : undefined
  for (const market of markets) {
    if (market.quote_corridor !== 'lightning') continue
    // The transport is the client's to build, but a market with no rendezvous
    // to build one from is not a corridor this wallet can offer.
    if (!rfqRendezvousOf(market)) continue
    // Read off the market rather than the type: `emulator_pubkey` postdates the
    // pinned @arkade-os/solver-discovery, so DiscoveredMarket does not declare
    // it yet even though the registry schema, its validator and its reducer all
    // carry it (arkade-os/solver-registry#18). The shape check below is what
    // makes reading an undeclared field safe.
    const advertised = (market as { emulator_pubkey?: unknown }).emulator_pubkey
    const emulatorPubkey =
      advertised === undefined || advertised === null || advertised === ''
        ? pinned
        : typeof advertised === 'string' && XONLY_HEX.test(advertised)
          ? advertised
          : undefined
    if (!emulatorPubkey) continue
    if (pinned && emulatorPubkey !== pinned) continue
    // sideLimits is the registry's own parser: it reads a disabled side
    // (max "0") or a malformed bound as null. Parsing the raw strings here
    // instead would turn a disabled side into a 0..0 range and report it to
    // the user as "amount outside solver bounds" rather than "no solver".
    const bounds = sideLimits(market, side)
    if (!bounds) continue
    return { market, minSats: Number(bounds.min), maxSats: Number(bounds.max) }
  }
  return undefined
}

/**
 * Name the transaction that spent a funded lockup.
 *
 * The txid only — WHICH spend it was is `RfqSwapManager`'s answer, read off a
 * witness that hashes to the payment hash rather than off who got paid. This
 * exists because that answer carries no txid: `readLockupFate` reports
 * `returned` without naming the transaction, and the manager records
 * `refundTxid` only for a refund IT pushed. A solver's own
 * `nonInteractiveRefund` is neither, and the history row it creates is exactly
 * what the activity has to group against the funding tx.
 *
 * Returns undefined while the lockup is unspent, and for a swept one: neither
 * has a spender to name.
 */
export const lockupSpenderTxid = async (
  indexer: Pick<RestIndexerProvider, 'getVtxos'>,
  lockup: { fundingTxid: string; swapPkScript: string },
): Promise<string | undefined> => {
  const { vtxos } = await indexer.getVtxos({ scripts: [lockup.swapPkScript] })
  // The query is already scoped to the one script, so the funding txid is what
  // distinguishes this deposit — identical quotes derive the same address.
  const funded = vtxos.find((v) => v.txid === lockup.fundingTxid)
  if (funded?.virtualStatus.state !== 'spent') return undefined
  return funded.arkTxId ?? funded.spentBy ?? undefined
}
