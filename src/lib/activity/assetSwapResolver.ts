import type { ActivityResolver } from '@arkade-os/sdk'
import { getAssetSwaps } from '@arkade-os/swap'
import { assetSwapRepository, type WalletAssetSwap } from '../swapRepository'
import { txidOfArkTransaction } from '../transactionHistory'

export const ASSET_SWAP_RESOLVER_ID = 'arkade-wallet:asset-swaps'
export const ASSET_SWAP_ACTIVITY_KIND = 'swap'

const readSwaps = async (): Promise<WalletAssetSwap[]> =>
  (await getAssetSwaps(assetSwapRepository)) as WalletAssetSwap[]

/** Correlation only: which txids belong to `swap:<id>`. Display facts are
 * derived in `activitiesToTxs` from the live record, so nothing here needs to
 * survive past the group id. */
export const assetSwapResolver = (read = readSwaps): ActivityResolver => {
  let byTxid = new Map<string, string>()
  return {
    id: ASSET_SWAP_RESOLVER_ID,
    async prepare() {
      // re-read on every history load: the restore scan writes its records
      // after the first one, and an index cached at construction would leave
      // those swaps ungrouped until the next reconnect
      const next = new Map<string, string>()
      for (const swap of await read()) {
        next.set(swap.fundingTxid, swap.id)
        if (swap.spentTxid) next.set(swap.spentTxid, swap.id)
      }
      byTxid = next
    },
    resolve(tx) {
      const swapId = byTxid.get(txidOfArkTransaction(tx))
      if (!swapId) return undefined
      return [{ groupId: `swap:${swapId}`, kind: ASSET_SWAP_ACTIVITY_KIND, label: 'Swap', metadata: { swapId } }]
    },
  }
}
