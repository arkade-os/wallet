import type { Offer } from '@arkade-os/swap'
import type { Tx } from './types'

/**
 * The cancel spend returns the deposit: a BTC offer gets its sats back (no
 * want-asset delivered), an asset offer gets the asset back.
 *
 * Kept wallet-side rather than replaced by the package's `classifySpend`,
 * which reads the covenant leaf the spend took: that is authoritative where
 * this is inferential, but it needs a parsed spending transaction and the
 * deposit outpoint, and the wallet's records carry neither — only the wallet
 * history row this reads. The one caller left is the failed-cancel
 * reconciliation, which starts from that history row.
 *
 * TODO: store the deposit outpoint, then classify with `classifySpend` and
 * delete this.
 */
export function isCancelSpend(offer: Offer, spend: Tx): boolean {
  if (offer.wantAsset) {
    const wantId = offer.wantAsset.toString()
    return !spend.assets?.some((a) => a.assetId === wantId && a.amount > BigInt(0))
  }
  const offerId = offer.offerAsset!.toString()
  return Boolean(spend.assets?.some((a) => a.assetId === offerId && a.amount > BigInt(0)))
}
