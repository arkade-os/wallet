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
 * **The v1 keyspace is not read at all.** It was, until the v2 move made every
 * writer of it dead: the client persists its own records, and no swap predating
 * that move survives anywhere that matters — swaps are gated by the solver card
 * and the bundled default does not serve, so the pre-v2 population is a handful
 * of developers. Reading two keyspaces to merge one of them with nothing in it
 * is the compatibility this release exists to drop.
 */
import type { ActivityResolver } from '@arkade-os/sdk'
import { BTC_ASSET_ID } from '@arkade-os/swap/protocol'
import {
  parseAssetId,
  type AssetId,
  type CorridorSwapRecord,
  type OfferSwapRecord,
  type SwapRecord,
} from '@arkade-os/swap'
// The record-reading half, which rc.3's root curation moved to `./advanced`.
// That subpath is explicitly not a compatibility promise — its names move with
// the client's internals across minor versions — so this import is the one to
// re-check on a swap-package bump. It is here rather than `client.swaps()`
// because this read must work in a tab that does not hold the drive lock, and
// the client only exists in the tab that does.
import { ACTIVITY_TOKEN, corridorOutcome, readableRecord, splitRecords } from '@arkade-os/swap/advanced'
import { consoleError } from './logs'
import { assetSwapRepository, quoteSnapshotOf, type WalletAssetSwap } from './swapRepository'
import { txidOfArkTransaction } from './transactionHistory'

/** What the history needs to render one Lightning send.
 *
 * Declared here rather than beside a reader, because the v2 corridor record is
 * now its only source: `sendViewOf` below is the whole of the projection. */
export interface LnSendView {
  rfqId: string
  fundingTxid: string
  state: CorridorSwapRecord['state']
  /** Sats the lockup was funded with. The record is the only place this
   * survives for a send Arkade's own history cannot see — see
   * `ungroupedLnSendTx` in `activityHistory.ts`. */
  amount: number
  /** When the send was made, unix seconds — the same clock `Tx.createdAt` uses,
   * so a row built from the record sorts beside rows built from history. */
  createdAt: number
  /** The tx that ended it, when that tx is one of ours. */
  spendTxid?: string
}

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

/** Every offer swap the wallet can render — the v2 client's own, which is all
 * of them. */
export const offerSwaps = async (): Promise<WalletAssetSwap[]> => {
  const { offer } = splitRecords(await readRecords())
  return offer.map(offerViewOf)
}

/** The Lightning sends, for the row builder. */
export const lnSendViews = async (): Promise<LnSendView[]> => {
  const { corridor } = splitRecords(await readRecords())
  return corridor.flatMap((record) => sendViewOf(record) ?? [])
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
 * Covers the v2 records for both families, and is the only swap resolver the
 * wallet registers. The package's `swapActivityResolver` went with the v1
 * keyspace it read.
 */
export const swapRecordResolver = (read = readRecords): ActivityResolver => {
  let intents = new Map<
    string,
    { groupId: string; label: string; outcome?: string; metadata: Record<string, unknown> }
  >()
  return {
    id: ASSET_SWAP_RESOLVER_ID,
    async prepare() {
      // re-read on every history load rather than indexed at construction: a
      // record written after the first load would otherwise leave its swap
      // ungrouped until the next reconnect
      const next = new Map<
        string,
        { groupId: string; label: string; outcome?: string; metadata: Record<string, unknown> }
      >()
      const records = await read()
      const offerIntent = (id: string) => ({
        groupId: `swap:${id}`,
        label: 'Swap',
        metadata: { swapId: id },
      })
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
