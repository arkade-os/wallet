/**
 * The wallet's BOLT11 gate — the lightning corridor's `decode` override, and
 * all that is left on this side of the v2 client.
 *
 * It turns a BOLT11 string into the `InvoiceFacts` the corridor requires and
 * refuses what the wallet can already prove unusable. The corridor gates on
 * expiry too, but it can only do so because this hands it an ABSOLUTE
 * `expiresAt` — BOLT11 encodes expiry as a delta from the invoice's creation
 * time, so that field exists only thanks to the decoder exposing `timestamp`
 * (see `bolt11.ts`).
 *
 * Wired once as the override, it runs on both directions: the payer's invoice
 * on a send and the SOLVER's hold invoice on a receive pass the same rules.
 *
 * What used to live here and does not any more: picking which discovered market
 * is the corridor, in each direction, and the card's amount bounds. The client
 * resolves the route from the destination and selects the market itself, so a
 * second selection here would only be a second thing to disagree with it.
 */
import type { NetworkName } from '@arkade-os/sdk'
import type { InvoiceFacts } from '@arkade-os/swap'
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
