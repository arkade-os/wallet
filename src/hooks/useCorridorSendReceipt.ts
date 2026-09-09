import { Tx } from '../lib/types'

/** In `Details`' own field names, so a caller spreads it. */
export interface CorridorSendReceipt {
  /** The tx the wallet signed: it funded the lockup covenant. */
  fundedTxid: string
  /** The tx that spent that covenant — absent while the swap is in flight. */
  spendTxid?: string
  spendLabel: string
  /** On `arkade -> onchain`, the transaction that pays the destination. */
  claimTxid?: string
  corridor?: string
  recipientGets?: number
  /** Always 0, always spread: `networkFee` holds the corridor quote's fee, so `Details`' own value bills it twice. */
  fees: number
  /** The solver's spread, sats — not the network fee. */
  swapFeeSats?: number
  solver?: string
  /** Covenant internals: the advanced rows, and nothing a payment needs. */
  htlcAddress?: string
  refundLocktime?: number
}

// Corridor ids, not rail names: discovery spells them `arkade | lightning |
// onchain`, while `bitcoin` is the RAIL that `onchain` settles on. Comparing
// against the rail left every on-chain send unlabelled and still reading
// "Completed" for a lockup spend that had not paid anyone.
const CORRIDOR_LABEL: Record<string, string> = { lightning: 'Lightning', onchain: 'On-chain' }

/**
 * The receipt for a corridor send. Funding the lockup is only acceptance; a
 * second transaction finishes the payment. On Lightning that is the solver's
 * claim and its hash-verified spend IS the invoice being paid, so "Completed"
 * is honest; on `arkade -> onchain` it is NOT — the lockup spend only proves
 * the solver took its side, and this wallet's own L1 claim is what pays the
 * recipient. The legacy `lnSend` bag is still read, so old receipts survive.
 */
export function useCorridorSendReceipt(tx: Tx | undefined): CorridorSendReceipt | undefined {
  const swap = tx?.lnSwap
  const legacy = tx?.lnSend
  const fundedTxid = swap?.fundingTxid ?? (legacy ? tx?.redeemTxid : undefined)
  if (!fundedTxid) return undefined
  const spendTxid = swap?.spendTxid ?? legacy?.spend?.spentTxid
  // "Refunded", not "Cancelled": nobody cancelled anything.
  const refunded = swap ? swap.outcome === 'refunded' : legacy?.spend?.outcome === 'refunded'
  const onchain = swap?.corridor === 'onchain'
  return {
    fundedTxid,
    spendTxid,
    spendLabel: refunded ? 'Refunded' : onchain ? 'Lockup spent' : 'Completed',
    claimTxid: swap?.claimTxid,
    corridor: swap?.corridor ? (CORRIDOR_LABEL[swap.corridor] ?? swap.corridor) : undefined,
    fees: 0,
    recipientGets: swap?.takeAmount,
    swapFeeSats: swap?.feeAmount,
    solver: swap?.solver,
    htlcAddress: swap?.htlcAddress,
    refundLocktime: swap?.refundLocktime,
  }
}
