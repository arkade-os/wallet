import { Tx } from '../lib/types'

/**
 * The two txids a Lightning-send receipt shows, and what to call the second.
 *
 * Field names are `Details`' own, so a caller spreads this into `DetailsProps`
 * rather than copying it across field by field — the rename in transit that
 * `spentTxid` would force is a one-character trap between the only producer of
 * this shape and its only consumer.
 */
export interface LnSendReceipt {
  /** The tx the wallet signed: it funded the lockup covenant. */
  fundedTxid: string
  /** The tx that spent that covenant — absent while the swap is in flight. */
  spendTxid?: string
  /** Row label for `spendTxid`, naming which spend it was. */
  spendLabel: string
}

/**
 * The receipt for a Lightning send: its funding tx and the tx that ended it.
 *
 * A Lightning send does not settle when the funding tx does. Funding the lockup
 * covenant is only acceptance; the payment is finished by a second transaction
 * the wallet never signs — the solver's claim once it has paid the invoice, or
 * the refund back to us when it could not. Showing one anonymous "Transaction
 * ID" for the first leg says nothing about which of those happened, so the
 * receipt shows both, the way an asset swap already does.
 *
 * Pure, and deliberately so. This used to resolve the second leg itself, with
 * an indexer call and a localStorage write from whatever screen happened to be
 * open. `RfqSwapManager` now owns that answer and records it as the swap ends
 * (see `providers/lnSwaps`), the history carries it onto the row, and this only
 * reads. A row still carrying the legacy `lnSend` metadata — a send made before
 * the records existed — is read from there instead, so old receipts keep
 * working without a migration.
 *
 * Returns undefined for anything that is not a Lightning send, so callers can
 * branch on its presence.
 */
export function useLnSendReceipt(tx: Tx | undefined): LnSendReceipt | undefined {
  const swap = tx?.lnSwap
  const legacy = tx?.lnSend
  const fundedTxid = swap?.fundingTxid ?? (legacy ? tx?.redeemTxid : undefined)
  if (!fundedTxid) return undefined
  const spendTxid = swap?.spendTxid ?? legacy?.spend?.spentTxid
  // "Refunded", not "Cancelled": nobody cancelled anything — the solver could
  // not pay the invoice and the covenant returned the funds.
  const refunded = swap ? swap.outcome === 'refunded' : legacy?.spend?.outcome === 'refunded'
  return { fundedTxid, spendTxid, spendLabel: refunded ? 'Refunded' : 'Completed' }
}
