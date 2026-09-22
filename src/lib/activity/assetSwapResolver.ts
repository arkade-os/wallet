import type { ActivityResolver } from '@arkade-os/sdk'
import { getAssetSwaps } from '@arkade-os/swap'
import { allocateActivityEvidence } from '../activityEvidence'
import { readCarrierActivity } from '../carrierActivity'
import { assetSwapRepository, type WalletAssetSwap } from '../swapRepository'
import { txidOfArkTransaction } from '../transactionHistory'

export const ASSET_SWAP_RESOLVER_ID = 'arkade-wallet:asset-swaps'
export const ASSET_SWAP_ACTIVITY_KIND = 'swap'

const readSwaps = async (): Promise<WalletAssetSwap[]> =>
  (await getAssetSwaps(assetSwapRepository)) as WalletAssetSwap[]

/** Correlation only: which txids belong to `swap:<id>`. Display facts are
 * derived in `activitiesToTxs` from the live record, so nothing here needs to
 * survive past the group id. */
export const assetSwapResolver = (read: () => Promise<WalletAssetSwap[]> = () => readSwaps()): ActivityResolver => {
  let swaps: WalletAssetSwap[] = []
  let legacyByTxid = new Map<string, WalletAssetSwap[]>()
  return {
    id: ASSET_SWAP_RESOLVER_ID,
    async prepare() {
      // re-read on every history load: the restore scan writes its records
      // after the first one, and an index cached at construction would leave
      // those swaps ungrouped until the next reconnect
      swaps = await read()
      const evidence = allocateActivityEvidence(swaps, [])
      const next = new Map<string, WalletAssetSwap[]>()
      for (const swap of swaps) {
        if (evidence.swap(swap.id)?.status !== 'missing') continue
        const add = (txid: string | undefined) => {
          if (!txid) return
          const records = next.get(txid) ?? []
          if (!records.some((record) => record.id === swap.id)) next.set(txid, [...records, swap])
        }
        add(swap.fundingTxid)
        add(swap.spentTxid)
        // only this record's own verified txids, and they join the SAME group,
        // so a claim or recovery enriches the swap instead of adding a row
        for (const txid of readCarrierActivity(swap.carrier)?.txids ?? []) add(txid)
      }
      legacyByTxid = next
    },
    resolve(tx) {
      const allocation = allocateActivityEvidence(swaps, [tx]).member(tx)
      const evidenced = allocation?.allocations.flatMap(({ swapId, contribution }) => {
        const swap = swaps.find((record) => record.id === swapId)
        if (!swap) return []
        const carrier = readCarrierActivity(swap.carrier)
        return {
          groupId: `swap:${swap.id}`,
          kind: ASSET_SWAP_ACTIVITY_KIND,
          label: 'Swap',
          metadata: { swapId: swap.id, ...(carrier ? { carrier } : {}) },
          amount: Number(contribution.sats),
        }
      })
      if (evidenced?.length) return evidenced
      const records = legacyByTxid.get(txidOfArkTransaction(tx))
      if (records?.length !== 1) return undefined
      const swap = records[0]
      const carrier = readCarrierActivity(swap.carrier)
      return [
        {
          groupId: `swap:${swap.id}`,
          kind: ASSET_SWAP_ACTIVITY_KIND,
          label: 'Swap',
          metadata: { swapId: swap.id, ...(carrier ? { carrier } : {}) },
        },
      ]
    },
  }
}
