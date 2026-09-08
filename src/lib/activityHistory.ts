import type { Activity } from '@arkade-os/sdk'
import { isRfqSwapTerminal } from '@arkade-os/swap'
import { ASSET_SWAP_ACTIVITY_KIND, CORRIDOR_LABEL, type LnSendView } from './swapRecords'
import { consoleError } from './logs'
import type { TransactionActivityMetadata } from './storage'
import { buildAssetSwapActivityTx } from './swapDisplay'
import type { ExitRecord } from './exitHistory'
import type { WalletAssetSwap } from './swapRepository'
import { arkTransactionToTx, sortLocalTxs, txidOfArkTransaction } from './transactionHistory'
import type { Tx } from './types'

export interface ActivityHistoryOptions {
  /** Live records — the resolver only correlated txids to swap ids. */
  swaps: WalletAssetSwap[]
  /** The Lightning sends, as stored. `RfqSwapManager` owns their state; this
   * is the read side of it, and the only source of a row's outcome detail and
   * of the receipt's second txid — and, for a send Arkade's history does not
   * report at all, the only source of the row itself. See
   * `ungroupedLnSendTx`. */
  lnSends?: LnSendView[]
  /** The unilaterally exited coins, already dated by `resolveExits`. Passed as
   * records rather than read back out of `metadata`: an unconfirmed exit is
   * deliberately never persisted, so the store cannot answer for it. See
   * `exitTx`. */
  exits?: ExitRecord[]
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

/** Every swap group carries the same `swap` kind, so the corridor is what
 * tells them apart — and it is `swapKind`, never the group id, since both
 * namespaces are `swap:`. Set by `swapRecordResolver` for the client's own
 * records and by the package's resolver for the v1 rows. */
const rfqSwapKindOf = (activity: Activity): string | undefined =>
  activity.intent?.metadata?.swapKind as string | undefined

/** Which swap a group belongs to, by the resolver's own metadata. The group id
 * says the same thing, but only by string surgery on a namespace the package
 * owns. */
const rfqIdOf = (activity: Activity): string | undefined => activity.intent?.metadata?.rfqId as string | undefined

/** The record's own facts, which no transaction in history carries. */
const corridorFacts = (record: LnSendView | undefined) => ({
  corridor: record?.corridor,
  takeAmount: record?.takeAmount,
  feeAmount: record?.feeAmount,
  solver: record?.solver,
  claimTxid: record?.claimTxid,
  htlcAddress: record?.htlcAddress,
  refundLocktime: record?.refundLocktime,
})

/** One row for a corridor send — Lightning or on-chain.
 *
 *  **The record says which tx funded the swap; the group cannot.** History nets
 *  the funding row to zero and drops it — it pays a covenant this wallet
 *  registered — so the member that survives is the LOCKUP BEING SPENT. Keying
 *  the metadata or the record off it looked both up where nothing was written. */
const corridorSendTx = (
  activity: Activity,
  metadata: Record<string, TransactionActivityMetadata>,
  lnSends: LnSendView[],
): Tx | undefined => {
  const leg = activity.txs.find((tx) => tx.type === 'SENT')
  if (!leg) return undefined
  const record = lnSends.find((view) => view.rfqId === rfqIdOf(activity))
  const fundingTxid = record?.fundingTxid ?? txidOfArkTransaction(leg)
  const base = arkTransactionToTx(leg, metadata[fundingTxid])
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
      ...corridorFacts(record),
    },
    historyKey: activity.id,
  }
}

/**
 * One row for a Lightning receive: the claim that paid us.
 *
 * The mirror of the send, minus the funding leg — on this corridor the SOLVER
 * funds the lockup, so the only transaction of ours is the claim. That has a
 * consequence worth stating: a receive that ended `refunded` has no transaction
 * in this wallet's history at all, so it produces no group and therefore no
 * row. The `lost` copy below is reachable only for a receive that got some of
 * its money — a piecemeal funding we partly claimed — not for one that never
 * arrived. Surfacing those is an activity-model question, not a row-builder
 * one.
 *
 * No `fundingTxid` is set, deliberately: `useCorridorSendReceipt` keys the send
 * receipt off exactly that field and returns undefined without it, which is
 * what keeps a receive row from opening a receipt built for the other leg.
 */
const lightningReceiveTx = (
  activity: Activity,
  metadata: Record<string, TransactionActivityMetadata>,
): Tx | undefined => {
  const claim = activity.txs.find((tx) => tx.type === 'RECEIVED')
  if (!claim) return undefined
  const claimTxid = txidOfArkTransaction(claim)
  return {
    ...arkTransactionToTx(claim, metadata[claimTxid]),
    amount: Math.abs(activity.amount),
    type: activity.amount < 0 ? 'sent' : 'received',
    lnSwap: { label: activity.intent?.label, outcome: activity.intent?.outcome },
    historyKey: activity.id,
  }
}

/**
 * One row for a Lightning send Arkade's own history does not report.
 *
 * **Why any send is missing at all.** Funding the lockup is an ordinary Arkade
 * transaction, but the covenant it pays is a contract THIS wallet registered
 * (`registerLockupContract`), so `buildTransactionHistory` sees the lockup
 * output among the wallet's own outputs and counts it as change. Funding minus
 * change is then zero on a corridor with no fee, and a zero-amount movement is
 * not emitted — so the transaction that committed the money produces no row,
 * and nothing appears until a SECOND transaction spends the lockup. That second
 * transaction is the solver's claim, which lands only once the invoice is
 * actually paid — a wait the payer does not control and that can outlast the
 * app being open. The payment was in flight the whole time with nothing on
 * screen to say so.
 *
 * So the record answers for it. It holds what history has lost — the amount,
 * the funding txid, the time, the state — and it is written before the refresh
 * that rebuilds this list, so the row is there on the first render after
 * signing.
 *
 * Emitted only for a send no group covers. Once the lockup is spent the group
 * exists and `lightningSendTx` builds the real row from the transactions
 * themselves, under this same key, so the row is replaced rather than doubled.
 * Terminal sends are kept for the same reason they are worth showing at all: a
 * refund returns the money through a transaction that nets to zero the same
 * way, so dropping them here would make a payment vanish from the list at the
 * moment it came back.
 */
const ungroupedLnSendTx = (send: LnSendView, metadata: Record<string, TransactionActivityMetadata>): Tx =>
  graftMetadata(
    {
      amount: send.amount,
      boardingTxid: '',
      createdAt: send.createdAt,
      // Offchain: there is no on-chain transaction to open in an explorer.
      explorable: undefined,
      // The wallet's own send convention (see `arkTransactionToTx`): an
      // outgoing Arkade transaction is final as soon as it is signed. What is
      // pending here is the swap, and `outcome` is what says so.
      preconfirmed: false,
      redeemTxid: send.fundingTxid,
      roundTxid: '',
      settled: true,
      type: 'sent',
      lnSwap: {
        // The same copy the package's resolver emits for this corridor, so a
        // row does not rename itself when the group finally arrives.
        label: CORRIDOR_LABEL[send.kind] ?? 'Swap',
        // `RFQ_SWAP_TERMINAL_STATES` and the resolver's outcome tokens are the
        // same three words, which is what lets the state stand in for the
        // token: everything short of an ending reads as pending.
        outcome: isRfqSwapTerminal(send.state) ? send.state : 'pending',
        fundingTxid: send.fundingTxid,
        spendTxid: send.spendTxid,
        ...corridorFacts(send),
      },
      // The group id the resolver would give this swap, so the key survives the
      // handover to the real row.
      historyKey: `swap:${send.rfqId}`,
    },
    metadata[send.fundingTxid],
  )

/**
 * One row for an offer whose funding tx Arkade's history does not report.
 *
 * Same shape of problem as `ungroupedLnSendTx`, same answer: `createOffer`
 * registers the covenant as a contract of this wallet, so the deposit reads as
 * change and `buildTransactionHistory` drops the tx on its `txAmount !== 0`
 * guard. A resting offer may never be spent, so nothing would ever appear.
 * Keyed as the resolver would key it, so the real row replaces this one.
 */
const ungroupedOfferTx = (
  swap: WalletAssetSwap,
  { network, assetDisplay }: Pick<ActivityHistoryOptions, 'network' | 'assetDisplay'>,
): Tx => ({
  ...buildAssetSwapActivityTx(swap, [], { network, assetDisplay }),
  amount: swap.fromAsset === 'btc' ? Number(swap.fromAmount) : 0,
  historyKey: `swap:${swap.id}`,
})

/**
 * One row for a unilateral exit, which Arkade's history does not report.
 *
 * The sent side of `buildTransactionHistory` is gated on `isSpent`, and the SDK
 * is explicit that an unrolled output never sets it — *"not set to true if the
 * virtual output is unrolled or swept, only when it's spent offchain"*. So an
 * exit leaves the original RECEIVED row standing and adds nothing, and the
 * balance drops with nothing to explain it. Same shape of problem as
 * `ungroupedLnSendTx`, same answer.
 *
 * Both rows stay. The money did arrive and then leave.
 *
 * No metadata graft: the store is keyed by txid, and for an exit that txid is
 * the receive's — grafting would hang the receive's destination and network fee
 * on the exit. `settled` because the exit is done, not because the sweep is:
 * the sats are onchain behind their CSV timelock until the exit tool moves
 * them. `networkFee` is 0 rather than `defaultFee` because a unilateral exit
 * pays no Ark fee — its real cost went to miners across the exit branch, which
 * this wallet never saw and cannot price.
 */
const exitTx = (exit: ExitRecord): Tx => ({
  amount: exit.value,
  boardingTxid: '',
  createdAt: exit.exitedAt,
  explorable: exit.txid,
  historyKey: `exit:${exit.txid}:${exit.vout}`,
  networkFee: 0,
  preconfirmed: false,
  // Onchain once unrolled, which is why the receipt must not treat this row as
  // an offchain tx — see `isOffchainTx` in `screens/Wallet/Transaction`.
  redeemTxid: exit.txid,
  roundTxid: '',
  settled: true,
  type: 'exit',
})

/** `Activity[]` -> the `Tx[]` the UI already reads. Pure and synchronous.
 *
 * Only groups we know how to collapse become a single row; everything else
 * emits one row per member, so a built-in grouping deposits or exits cannot
 * change the row count. */
export const activitiesToTxs = (activities: Activity[], options: ActivityHistoryOptions): Tx[] => {
  const { swaps, metadata, network, assetDisplay, lnSends = [], exits = [] } = options
  const rows: Tx[] = []
  for (const activity of activities) {
    const swapKind = rfqSwapKindOf(activity)
    if (swapKind === 'lightning_send' || swapKind === 'onchain_send') {
      const row = corridorSendTx(activity, metadata, lnSends)
      if (row) {
        rows.push(row)
        continue
      }
      // No sent member means the record named a txid this history does not
      // have. Fall through rather than drop the group: whatever IS here is
      // still the user's money moving.
    }
    if (swapKind === 'lightning_receive') {
      const row = lightningReceiveTx(activity, metadata)
      if (row) {
        rows.push(row)
        continue
      }
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
  // The sends history cannot see, from the store that can — see
  // `ungroupedLnSendTx`. Keyed on the rfq id rather than the funding txid: that
  // is what the group carries, and a send whose funding tx IS in history is
  // grouped by it.
  const grouped = new Set(activities.flatMap((activity) => rfqIdOf(activity) ?? []))
  for (const send of lnSends) {
    if (!grouped.has(send.rfqId)) rows.push(ungroupedLnSendTx(send, metadata))
  }
  // The offers history cannot see either — see `ungroupedOfferTx`.
  const groupedSwaps = new Set(activities.flatMap((activity) => swapIdOf(activity) ?? []))
  for (const swap of swaps) {
    if (!groupedSwaps.has(swap.id)) rows.push(ungroupedOfferTx(swap, { network, assetDisplay }))
  }
  // Exits last, for the same reason: history reports none of them either.
  for (const exit of exits) rows.push(exitTx(exit))
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
