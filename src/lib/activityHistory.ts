import type { Activity, ArkTransaction } from '@arkade-os/sdk'
import { isRfqSwapTerminal } from '@arkade-os/swap'
import { ASSET_SWAP_ACTIVITY_KIND } from './activity/assetSwapResolver'
import { allocateActivityEvidence } from './activityEvidence'
import { readCarrierActivity, type CarrierActivity } from './carrierActivity'
import { consoleError } from './logs'
import type { TransactionActivityMetadata } from './storage'
import { buildAssetSwapActivityTx } from './swapDisplay'
import type { ExitRecord } from './exitHistory'
import type { LnSendView, RfqCarrierSnapshot } from './lnSendRecords'
import type { WalletAssetSwap } from './swapRepository'
import { arkTransactionToTx, sortLocalTxs, txidOfArkTransaction } from './transactionHistory'
import type { Tx } from './types'

export interface ActivityHistoryOptions {
  /** Live records — the resolver only correlated txids to swap ids. */
  swaps: (WalletAssetSwap & { carrier?: CarrierActivity })[]
  /** The Lightning sends, as stored. `RfqSwapManager` owns their state; this
   * is the read side of it, and the only source of a row's outcome detail and
   * of the receipt's second txid — and, for a send Arkade's history does not
   * report at all, the only source of the row itself. See
   * `ungroupedLnSendTx`. */
  lnSends?: LnSendView[]
  rfqCarriers?: RfqCarrierSnapshot
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

/** Raw members, oldest-first: the chain survives when the `Tx` fields can name
 *  only one of them. Evidence, not new rows. */
const membersOfTransactions = (txs: ArkTransaction[]): { txid: string; type: string }[] =>
  // the SDK's own member sort, not plain chronological order
  [...txs]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((tx) => ({ txid: txidOfArkTransaction(tx), type: String(tx.type).toLowerCase() }))

const membersOf = (activity: Activity): { txid: string; type: string }[] => membersOfTransactions(activity.txs)

const sameArkTransactionMember = (left: ArkTransaction, right: ArkTransaction): boolean => {
  if (
    txidOfArkTransaction(left) !== txidOfArkTransaction(right) ||
    left.type !== right.type ||
    left.amount !== right.amount ||
    left.assets?.length !== right.assets?.length
  ) {
    return false
  }
  return (left.assets ?? []).every(
    (asset, index) => asset.assetId === right.assets?.[index]?.assetId && asset.amount === right.assets[index].amount,
  )
}

const mergeArkTransactionMembers = (primary: ArkTransaction[], additional: ArkTransaction[] = []): ArkTransaction[] =>
  [...primary, ...additional].filter(
    (candidate, index, members) => members.findIndex((member) => sameArkTransactionMember(member, candidate)) === index,
  )

const swapIdOf = (activity: Activity): string | undefined =>
  activity.intent?.kind === ASSET_SWAP_ACTIVITY_KIND
    ? (activity.intent.metadata?.swapId as string | undefined)
    : undefined

/** `@arkade-os/swap`'s resolver tags every corridor with the same `swap` kind
 * the asset resolver uses, so the corridor is what tells them apart — and it
 * is `swapKind`, never the group id, since both namespaces are `swap:`. */
const rfqSwapKindOf = (activity: Activity): string | undefined =>
  activity.intent?.metadata?.swapKind as string | undefined

/** Which swap a group belongs to, by the resolver's own metadata. The group id
 * says the same thing, but only by string surgery on a namespace the package
 * owns. */
const rfqIdOf = (activity: Activity): string | undefined => activity.intent?.metadata?.rfqId as string | undefined

const carrierForRfq = (activity: Activity, carriers: RfqCarrierSnapshot | undefined): CarrierActivity | undefined => {
  const rfqId = rfqIdOf(activity)
  return rfqId ? readCarrierActivity(carriers?.get(rfqId)) : undefined
}

const mergeMembers = (
  primary: { txid: string; type: string }[],
  additional: { txid: string; type: string }[] = [],
): { txid: string; type: string }[] => {
  const seen = new Set<string>()
  return [...primary, ...additional].filter(({ txid }) => {
    if (seen.has(txid)) return false
    seen.add(txid)
    return true
  })
}

/**
 * One row for a Lightning send: its funding tx, plus the refund when the swap
 * came back.
 *
 * Built off the funding tx rather than the group, so the row keeps that txid in
 * `redeemTxid` — that is the send's own transaction, the one a receipt written
 * before `lnSwap` existed still falls back to, and the id every other consumer
 * of a sent row expects. What the group contributes is the amount and the
 * outcome: a refunded send cost only its fees, and reporting the funding amount
 * for it would show money that came back as money spent.
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
  const record = lnSends.find((view) => view.rfqId === rfqIdOf(activity) && view.fundingTxid === fundingTxid)
  const carrier = record?.carrier
  return {
    ...base,
    amount: Math.abs(activity.amount),
    ...(carrier ? { carrier, carrierMembers: mergeMembers(membersOf(activity), record.members) } : {}),
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
 * No `fundingTxid` is set, deliberately: `useLnSendReceipt` keys the send
 * receipt off exactly that field and returns undefined without it, which is
 * what keeps a receive row from opening a receipt built for the other leg.
 */
const lightningReceiveTx = (
  activity: Activity,
  metadata: Record<string, TransactionActivityMetadata>,
  carrier: CarrierActivity | undefined,
): Tx | undefined => {
  const claim = activity.txs.find((tx) => tx.type === 'RECEIVED')
  if (!claim) return undefined
  const claimTxid = txidOfArkTransaction(claim)
  return {
    ...arkTransactionToTx(claim, metadata[claimTxid]),
    amount: Math.abs(activity.amount),
    ...(carrier
      ? {
          carrier,
          carrierMembers: mergeMembers(
            membersOf(activity),
            carrier.txids.map((txid) => ({ txid, type: 'related' })),
          ),
        }
      : {}),
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
      ...(send.carrier ? { carrier: send.carrier, carrierMembers: send.members } : {}),
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
        label: 'Lightning send',
        // `RFQ_SWAP_TERMINAL_STATES` and the resolver's outcome tokens are the
        // same three words, which is what lets the state stand in for the
        // token: everything short of an ending reads as pending.
        outcome: isRfqSwapTerminal(send.state) ? send.state : 'pending',
        fundingTxid: send.fundingTxid,
        spendTxid: send.spendTxid,
      },
      // The group id the resolver would give this swap, so the key survives the
      // handover to the real row.
      historyKey: `swap:${send.rfqId}`,
    },
    metadata[send.fundingTxid],
  )

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
  const { swaps, metadata, network, assetDisplay, lnSends = [], rfqCarriers, exits = [] } = options
  const rows: Tx[] = []
  const activityAllocation = allocateActivityEvidence(
    swaps,
    activities.flatMap((activity) => activity.txs),
  )
  const renderedAssetSwaps = new Set<string>()
  const emittedRawMembers = new Set<string>()
  const swapByTxid = new Map<string, WalletAssetSwap | null>()
  const correlatedMembers = new Map<string, ArkTransaction[]>()
  for (const swap of swaps) {
    if (!swap.id || !swap.offerHex) continue
    try {
      BigInt(swap.fromAmount)
      BigInt(swap.toAmount)
    } catch {
      continue
    }
    if (activityAllocation.swap(swap.id)?.status !== 'missing') continue
    const carrier = readCarrierActivity(swap.carrier)
    for (const txid of [swap.fundingTxid, swap.spentTxid, ...(carrier?.txids ?? [])].filter((id): id is string =>
      Boolean(id),
    )) {
      const current = swapByTxid.get(txid)
      if (current === null) continue
      swapByTxid.set(txid, current && current.id !== swap.id ? null : swap)
    }
  }
  for (const activity of activities) {
    if (swapIdOf(activity) || rfqSwapKindOf(activity)) continue
    for (const tx of activity.txs) {
      const correlatedSwap = swapByTxid.get(txidOfArkTransaction(tx))
      if (!correlatedSwap) continue
      correlatedMembers.set(
        correlatedSwap.id,
        mergeArkTransactionMembers(correlatedMembers.get(correlatedSwap.id) ?? [], [tx]),
      )
    }
  }
  for (const activity of activities) {
    const swapKind = rfqSwapKindOf(activity)
    if (swapKind === 'lightning_send') {
      const row = lightningSendTx(activity, metadata, lnSends)
      if (row) {
        rows.push(row)
        continue
      }
      // No sent member means the record named a txid this history does not
      // have. Fall through rather than drop the group: whatever IS here is
      // still the user's money moving.
    }
    if (swapKind === 'lightning_receive') {
      const row = lightningReceiveTx(activity, metadata, carrierForRfq(activity, rfqCarriers))
      if (row) {
        rows.push(row)
        continue
      }
    }
    const swapId = swapIdOf(activity)
    const swap = swapId ? swaps.find((record) => record.id === swapId) : undefined
    const swapAllocation = swap ? activityAllocation.swap(swap.id) : undefined
    const hasVerifiedMembership = Boolean(
      swap &&
        activity.txs.some((tx) =>
          activityAllocation.member(tx)?.allocations.some((allocation) => allocation.swapId === swap.id),
        ),
    )
    if (swap && (swapAllocation?.status === 'missing' || hasVerifiedMembership)) {
      try {
        const rawMembers = mergeArkTransactionMembers(activity.txs, correlatedMembers.get(swap.id) ?? [])
        const members = rawMembers.map((tx) => arkTransactionToTx(tx))
        const carrier = readCarrierActivity(swap.carrier)
        // a grouped row takes its metadata from the tx the group is anchored on
        const funding = rawMembers.find((tx) => txidOfArkTransaction(tx) === swap.fundingTxid)
        rows.push({
          ...graftMetadata(
            buildAssetSwapActivityTx(swap, carrier, members, {
              network,
              assetDisplay,
              allocation: swapAllocation,
            }),
            funding && metadata[txidOfArkTransaction(funding)],
          ),
          historyKey: activity.id,
          ...(carrier
            ? {
                carrierMembers: mergeMembers(
                  membersOfTransactions(rawMembers),
                  carrier.txids.map((txid) => ({ txid, type: 'related' })),
                ),
              }
            : {}),
        })
        renderedAssetSwaps.add(swap.id)
        continue
      } catch {}
    }
    // members of one activity share `activity.id`, so the member txid is what
    // keeps the row key unique
    for (const tx of activity.txs) {
      const txid = txidOfArkTransaction(tx)
      const memberKey = `${txid}:${String(tx.type).toLowerCase()}`
      if (activityAllocation.member(tx)?.allocations.length) continue
      if (emittedRawMembers.has(memberKey)) continue
      const correlatedSwap = swapId ? undefined : swapByTxid.get(txid)
      if (correlatedSwap) {
        correlatedMembers.set(
          correlatedSwap.id,
          mergeArkTransactionMembers(correlatedMembers.get(correlatedSwap.id) ?? [], [tx]),
        )
        continue
      }
      emittedRawMembers.add(memberKey)
      const carrier = swapKind ? carrierForRfq(activity, rfqCarriers) : undefined
      rows.push({
        ...arkTransactionToTx(tx, metadata[txid]),
        historyKey: `${activity.id}:${txid}`,
        ...(carrier ? { carrier } : {}),
      })
    }
  }
  for (const swap of swaps) {
    if (!swap.id || !swap.offerHex || renderedAssetSwaps.has(swap.id)) continue
    try {
      const carrier = readCarrierActivity(swap.carrier)
      const rawMembers = [...(correlatedMembers.get(swap.id) ?? [])].sort((a, b) => a.createdAt - b.createdAt)
      const members = rawMembers.map((tx) => arkTransactionToTx(tx))
      const funding = rawMembers.find((tx) => txidOfArkTransaction(tx) === swap.fundingTxid)
      rows.push({
        ...graftMetadata(
          buildAssetSwapActivityTx(swap, carrier, members, {
            network,
            assetDisplay,
            allocation: activityAllocation.swap(swap.id),
          }),
          funding && metadata[txidOfArkTransaction(funding)],
        ),
        historyKey: `swap:${swap.id}`,
        ...(carrier
          ? {
              carrierMembers: mergeMembers(
                rawMembers.map((tx) => ({ txid: txidOfArkTransaction(tx), type: String(tx.type).toLowerCase() })),
                carrier.txids.map((txid) => ({ txid, type: 'related' })),
              ),
            }
          : {}),
      })
    } catch {
      continue
    }
  }
  for (const member of activityAllocation.members()) {
    if (!member.allocations.length || (member.remainderSats === 0n && member.remainderAssets.length === 0)) continue
    const row = arkTransactionToTx(member.tx, metadata[member.txid])
    rows.push({
      ...row,
      amount: Number(member.remainderSats),
      assets: member.remainderAssets.length ? member.remainderAssets : undefined,
      historyKey: `arkade-wallet:asset-swap-residual:${member.txid}:${member.direction}`,
    })
  }
  // The sends history cannot see, from the store that can — see
  // `ungroupedLnSendTx`. Keyed on the rfq id rather than the funding txid: that
  // is what the group carries, and a send whose funding tx IS in history is
  // grouped by it.
  const grouped = new Set(activities.flatMap((activity) => rfqIdOf(activity) ?? []))
  for (const send of lnSends) {
    if (!grouped.has(send.rfqId)) rows.push(ungroupedLnSendTx(send, metadata))
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
