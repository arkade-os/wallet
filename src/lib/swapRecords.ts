/**
 * Reading the v2 client's own records, and projecting them into the shapes this
 * wallet's history already renders.
 *
 * **Why an adapter and not a rewrite.** The v2 client persists to its own
 * keyspace — `SwapRecord`, keyed by the client-minted quote id, with CAIP-19
 * asset ids and `AtomicDecimal` amounts — while the activity list, the row
 * builder and the transaction screen all speak the v1 vocabulary (`fromAsset` /
 * `toAsset` as discovery ids, sat numbers, `AssetSwapStatus`). Those two
 * vocabularies are a presentation boundary, not a correctness one: nothing
 * downstream of here decides anything about money. So the client keeps its own
 * shapes and this file maps them once, which is a great deal smaller than
 * retyping every row builder — and it is where a future rewrite starts.
 *
 * **Why v1 records are still read.** Two things still write them. The chain
 * restore scan (`restoreAssetSwaps`) rebuilds offer records from offer packets
 * in history and has no v2 equivalent, and every swap made before this wallet
 * moved to the v2 client is in the old keyspace. Both are real history, so the
 * readers below merge the two and let the v2 record win on an id collision —
 * which cannot happen today, since the keyspaces mint ids differently, and is
 * the safe direction if it ever does.
 */
import type { ActivityResolver } from '@arkade-os/sdk'
import { BTC_ASSET_ID, getAssetSwaps } from '@arkade-os/swap'
import {
  ACTIVITY_TOKEN,
  corridorOutcome,
  parseAssetId,
  readableRecord,
  splitRecords,
  type AssetId,
  type CorridorSwapRecord,
  type OfferSwapRecord,
  type SwapRecord,
} from '@arkade-os/swap/client'
import { consoleError } from './logs'
import { assetSwapRepository, quoteSnapshotOf, type WalletAssetSwap } from './swapRepository'
import type { LnSendView } from './lnSendRecords'
import { txidOfArkTransaction } from './transactionHistory'

export const ASSET_SWAP_RESOLVER_ID = 'arkade-wallet:asset-swaps'
export const ASSET_SWAP_ACTIVITY_KIND = 'swap'

/**
 * A CAIP-19 id as the wallet's display layer names assets: `btc` for BTC on any
 * rail, and the Arkade asset identity verbatim for everything else.
 *
 * `slip44:0` is BTC's asset part on every bitcoin-family rail, so the rail is
 * deliberately dropped — the row renders what moved, not which wire it moved
 * on, and the two legs of a corridor swap are the same coin.
 */
export const displayAssetOf = (id: AssetId): string => {
  try {
    const { assetNamespace, assetReference } = parseAssetId(id)
    return assetNamespace === 'slip44' ? BTC_ASSET_ID : assetReference
  } catch {
    return id
  }
}

/**
 * A v2 offer record as the activity list reads it.
 *
 * `swapAddress`, `swapPkScript` and `offerHex` ride along because the cancel
 * reconciliation still needs them, and the v2 record pins all three at accept —
 * which is the half of ts-sdk#680 the v2 record closed.
 */
const offerViewOf = (record: OfferSwapRecord): WalletAssetSwap => ({
  id: record.id,
  fromAsset: displayAssetOf(record.give.asset),
  toAsset: displayAssetOf(record.take.asset),
  // `AtomicDecimal` is already a decimal string of atomic units, which is
  // what the v1 shape carried — a copy, never a scale conversion.
  fromAmount: record.give.amount,
  toAmount: record.take.amount,
  swapAddress: record.swapAddress,
  swapPkScript: record.swapPkScript,
  offerHex: record.offerHex,
  fundingTxid: record.fundingTxid ?? '',
  spentTxid: record.spentTxid,
  status: record.status,
  createdAt: record.createdAt * 1000,
  completedAt: record.completedAt === undefined ? undefined : record.completedAt * 1000,
  // Quote-time display facts the client does not own; absent for a restored or
  // pre-migration swap, and every consumer falls back per field.
  quote: quoteSnapshotOf(record.id),
})

/** A v2 corridor record as the send-row builder reads it. Sends only: a receive
 * leg has no funding transaction of the trader's to anchor a row on. */
const sendViewOf = (record: CorridorSwapRecord): LnSendView | undefined => {
  if (record.kind !== 'lightning_send') return undefined
  const fundingTxid = record.fundingTxid
  if (!fundingTxid) return undefined
  return {
    rfqId: record.rfqId,
    fundingTxid,
    state: record.state,
    // The give leg is what the lockup was funded with, in sats.
    amount: Number(record.give.amount),
    createdAt: record.createdAt,
    spendTxid: record.refundTxid ?? record.lockupSpendTxids?.[0],
  }
}

const readRecords = async (): Promise<SwapRecord[]> => {
  try {
    return (await assetSwapRepository.getAllSwapRecords()).filter(readableRecord)
  } catch (err) {
    consoleError(err, 'error reading swap records')
    return []
  }
}

/**
 * Every offer swap the wallet can render: the v2 client's own, plus the v1 rows
 * the restore scan rebuilds and anything written before the move.
 */
export const offerSwaps = async (): Promise<WalletAssetSwap[]> => {
  const [records, legacy] = await Promise.all([
    readRecords(),
    getAssetSwaps(assetSwapRepository).catch((err) => {
      consoleError(err, 'error reading v1 asset swaps')
      return []
    }),
  ])
  const { offer } = splitRecords(records)
  const views = offer.map(offerViewOf)
  const seen = new Set(views.map((view) => view.id))
  // v2 wins on a collision; the keyspaces mint ids differently, so this is a
  // rule about the future rather than a case that arises today.
  return [...views, ...(legacy as WalletAssetSwap[]).filter((swap) => !seen.has(swap.id))]
}

/** The Lightning sends, from both keyspaces, for the row builder. */
export const lnSendViews = async (v1Views: LnSendView[]): Promise<LnSendView[]> => {
  const { corridor } = splitRecords(await readRecords())
  const views = corridor.flatMap((record) => sendViewOf(record) ?? [])
  const seen = new Set(views.map((view) => view.rfqId))
  return [...views, ...v1Views.filter((view) => !seen.has(view.rfqId))]
}

/** What the row builder calls each corridor. Mirrors the package's own labels,
 * because the copy is what a user reads and the two must not drift apart. */
const CORRIDOR_LABEL: Record<string, string> = {
  lightning_send: 'Lightning send',
  lightning_receive: 'Lightning receive',
  onchain_send: 'Onchain send',
}

/**
 * Which txids belong to which swap — correlation and the row's own label.
 *
 * Display facts are derived in `activitiesToTxs` from the live record, so the
 * only things carried here are what tells the row builders apart: `swapId` for
 * an offer, `rfqId` + `swapKind` for a corridor, and the corridor's outcome
 * token, which is what a Lightning row renders as its status.
 *
 * Covers the v2 records for both families plus the v1 OFFER rows the restore
 * scan writes. The v1 corridor rows stay with the package's own
 * `swapActivityResolver`, which reads them through each corridor handler's
 * `activityTxids` — reimplementing that here would put corridor knowledge in
 * the wallet, which is the thing adding a corridor would then come back to edit.
 */
export const swapRecordResolver = (read = readRecords): ActivityResolver => {
  let intents = new Map<
    string,
    { groupId: string; label: string; outcome?: string; metadata: Record<string, unknown> }
  >()
  return {
    id: ASSET_SWAP_RESOLVER_ID,
    async prepare() {
      // re-read on every history load: the restore scan writes its records
      // after the first one, and an index cached at construction would leave
      // those swaps ungrouped until the next reconnect
      const next = new Map<
        string,
        { groupId: string; label: string; outcome?: string; metadata: Record<string, unknown> }
      >()
      const [records, legacy] = await Promise.all([read(), getAssetSwaps(assetSwapRepository).catch(() => [])])
      const offerIntent = (id: string) => ({
        groupId: `swap:${id}`,
        label: 'Swap',
        metadata: { swapId: id },
      })
      for (const swap of legacy) {
        next.set(swap.fundingTxid, offerIntent(swap.id))
        if (swap.spentTxid) next.set(swap.spentTxid, offerIntent(swap.id))
      }
      for (const record of records) {
        if (record.family === 'offer') {
          const intent = offerIntent(record.id)
          if (record.fundingTxid) next.set(record.fundingTxid, intent)
          if (record.spentTxid) next.set(record.spentTxid, intent)
          continue
        }
        const intent = {
          // Keyed on the rfq id, matching the package's own corridor groups and
          // the `rfqId` a send view carries, so the ungrouped-send pass in
          // `activitiesToTxs` can tell a grouped send from one history cannot see.
          groupId: `swap:${record.rfqId}`,
          label: CORRIDOR_LABEL[record.kind] ?? 'Swap',
          outcome: ACTIVITY_TOKEN[corridorOutcome(record.kind, record.state)],
          metadata: { rfqId: record.rfqId, swapKind: record.kind },
        }
        if (record.fundingTxid) next.set(record.fundingTxid, intent)
        if (record.refundTxid) next.set(record.refundTxid, intent)
        for (const txid of record.lockupSpendTxids ?? []) next.set(txid, intent)
      }
      intents = next
    },
    resolve(tx) {
      const intent = intents.get(txidOfArkTransaction(tx))
      if (!intent) return undefined
      return [{ ...intent, kind: ASSET_SWAP_ACTIVITY_KIND }]
    },
  }
}
