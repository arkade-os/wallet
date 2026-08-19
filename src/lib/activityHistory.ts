import type { Activity } from '@arkade-os/sdk'
import { ASSET_SWAP_ACTIVITY_KIND } from './activity/assetSwapResolver'
import { consoleError } from './logs'
import type { TransactionActivityMetadata } from './storage'
import { buildAssetSwapActivityTx } from './swapDisplay'
import type { LnSendView } from './lnSendRecords'
import type { WalletAssetSwap } from './swapRepository'
import { arkTransactionToTx, sortLocalTxs, txidOfArkTransaction } from './transactionHistory'
import type { Tx } from './types'

export interface ActivityHistoryOptions {
  /** Live records — the resolver only correlated txids to swap ids. */
  swaps: WalletAssetSwap[]
  /** The Lightning sends, as stored. `RfqSwapManager` owns their state; this
   * is the read side of it, and the only source of a row's outcome detail and
   * of the receipt's second txid. */
  lnSends?: LnSendView[]
  /** Snapshot taken alongside the activity fetch. Never read in here: this
   * runs in a `useMemo`, so a `localStorage` read would be an undeclared dep. */
  metadata: Record<string, TransactionActivityMetadata>
  network?: string
  /** Deliberately a closure over the metadata cache ref rather than a memo dep:
   * rows do not re-derive on late-arriving metadata, matching the pre-activity
   * behaviour. `reloadWallet` prefetches into the cache before it sets history,
   * so the recompute that new history triggers already sees fresh entries. */
  assetDisplay?: (assetId: string) => { ticker?: string; decimals?: number } | undefined
}

const graftMetadata = (tx: Tx, metadata?: TransactionActivityMetadata): Tx =>
  metadata
    ? {
        ...tx,
        assetAction: metadata.assetAction ?? tx.assetAction,
        destination: metadata.destination ?? tx.destination,
        lnSend: metadata.lnSend ?? tx.lnSend,
        networkFee: metadata.networkFee ?? tx.networkFee,
      }
    : tx

const swapIdOf = (activity: Activity): string | undefined =>
  activity.intent?.kind === ASSET_SWAP_ACTIVITY_KIND
    ? (activity.intent.metadata?.swapId as string | undefined)
    : undefined

/** `@arkade-os/swap`'s resolver tags every corridor with the same `swap` kind
 * the asset resolver uses, so the corridor is what tells them apart — and it
 * is `swapKind`, never the group id, since both namespaces are `swap:`. */
const rfqSwapKindOf = (activity: Activity): string | undefined =>
  activity.intent?.metadata?.swapKind as string | undefined

/**
 * One row for a Lightning send: its funding tx, plus the refund when the swap
 * came back.
 *
 * Built off the funding tx rather than the group, so the row keeps that txid —
 * the receipt screen resolves the covenant's spender from `redeemTxid`, and a
 * row identified by anything else would look up a lockup that does not exist.
 * What the group contributes is the amount and the outcome: a refunded send
 * cost only its fees, and reporting the funding amount for it would show money
 * that came back as money spent.
 */
const lightningSendTx = (
  activity: Activity,
  metadata: Record<string, TransactionActivityMetadata>,
  lnSends: LnSendView[],
): Tx | undefined => {
  const funding = activity.txs.find((tx) => tx.type === 'SENT')
  if (!funding) return undefined
  const fundingTxid = txidOfArkTransaction(funding)
  const base = arkTransactionToTx(funding, metadata[fundingTxid])
  const record = lnSends.find((view) => view.fundingTxid === fundingTxid)
  return {
    ...base,
    amount: Math.abs(activity.amount),
    // Signed by the net, not by the funding leg: a refund larger than the
    // funding is not a thing this corridor can produce, but reading the
    // direction off the number is what keeps the row honest if it ever were.
    type: activity.amount > 0 ? 'received' : 'sent',
    lnSwap: {
      label: activity.intent?.label,
      outcome: activity.intent?.outcome,
      fundingTxid,
      // The receipt's second row, carried on the row rather than looked up when
      // the receipt opens: the store was already read to build this history,
      // and re-asking the indexer for a permanent answer is the lookup this
      // refactor exists to remove.
      spendTxid: record?.spendTxid,
    },
    historyKey: activity.id,
  }
}

/** `Activity[]` -> the `Tx[]` the UI already reads. Pure and synchronous.
 *
 * Only groups we know how to collapse become a single row; everything else
 * emits one row per member, so a built-in grouping deposits or exits cannot
 * change the row count. */
export const activitiesToTxs = (activities: Activity[], options: ActivityHistoryOptions): Tx[] => {
  const { swaps, metadata, network, assetDisplay, lnSends = [] } = options
  const rows: Tx[] = []
  for (const activity of activities) {
    if (rfqSwapKindOf(activity) === 'lightning_send') {
      const row = lightningSendTx(activity, metadata, lnSends)
      if (row) {
        rows.push(row)
        continue
      }
      // No sent member means the record named a txid this history does not
      // have. Fall through rather than drop the group: whatever IS here is
      // still the user's money moving.
    }
    const swapId = swapIdOf(activity)
    const swap = swapId ? swaps.find((record) => record.id === swapId) : undefined
    if (swap) {
      const members = activity.txs.map((tx) => arkTransactionToTx(tx))
      // a grouped row takes its metadata from the tx the group is anchored on
      const funding = activity.txs.find((tx) => txidOfArkTransaction(tx) === swap.fundingTxid)
      rows.push({
        ...graftMetadata(
          buildAssetSwapActivityTx(swap, members, { network, assetDisplay }),
          funding && metadata[txidOfArkTransaction(funding)],
        ),
        historyKey: activity.id,
      })
      continue
    }
    // members of one activity share `activity.id`, so the member txid is what
    // keeps the row key unique
    for (const tx of activity.txs) {
      const txid = txidOfArkTransaction(tx)
      rows.push({ ...arkTransactionToTx(tx, metadata[txid]), historyKey: `${activity.id}:${txid}` })
    }
  }
  return sortLocalTxs(rows)
}

interface ActivityHistorySource {
  getActivityHistory(): Promise<Activity[]>
}

export const getActivities = async (wallet: ActivityHistorySource): Promise<Activity[]> => {
  try {
    return await wallet.getActivityHistory()
  } catch (err) {
    consoleError(err, 'error getting activity history')
    return []
  }
}

/** Fetch and derive in one go. The provider uses the two halves separately —
 * it fetches on reload and derives in a memo, so swap-record changes reach the
 * screen without refetching history. */
export const getActivityTxHistory = async (
  wallet: ActivityHistorySource,
  options: ActivityHistoryOptions,
): Promise<Tx[]> => activitiesToTxs(await getActivities(wallet), options)
