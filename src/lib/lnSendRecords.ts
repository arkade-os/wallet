/**
 * The V1 Lightning-send records: read-only, and read only for history.
 *
 * Nothing writes them any more. The v2 client persists to its own keyspace, so
 * this file covers exactly one case — a send made before this wallet moved onto
 * that client — and everything it needs is what an older deploy already wrote.
 * `swapRecords.ts` merges what comes back here with the client's own records;
 * when the last v1 row ages out, this file goes with it.
 *
 * Two profile keys are still read for the same reason. `funding_txid` and
 * `spend_txid` were written by this wallet before ts-sdk#773 gave the record
 * fields of its own, and a store written then keeps its receipts and its
 * grouping only if they are read.
 */
import {
  rfqSwapActivityInputs,
  type LockupSpendIndexer,
  type RfqSwapRecord,
  type SwapActivityInput,
} from '@arkade-os/swap/protocol'
import { consoleError } from './logs'
import { assetSwapRepository } from './swapRepository'

const FUNDING_TXID = 'funding_txid'
const SPEND_TXID = 'spend_txid'

const profileTxid = (record: RfqSwapRecord, key: string): string | undefined => {
  const txid = record.profile[key]
  return typeof txid === 'string' && txid ? txid : undefined
}

/**
 * The tx that filled the lockup.
 *
 * `fundingTxid` is where it lives now. `funding_txid` is read only for
 * records written before it moved there — an older deploy's store, not a
 * shape anything still writes.
 */
export const fundingTxidOf = (record: RfqSwapRecord): string | undefined =>
  record.fundingTxid ?? profileTxid(record, FUNDING_TXID)

/**
 * The tx that ended the swap, when it is one of ours.
 *
 * `refundTxid` first: a refund the client pushed is the manager's own fact,
 * written as the push lands. Then `lockupSpendTxids`, which the manager now
 * stamps at finalization from the chain read that ended the swap — that is the
 * ordinary case, the solver's own `nonInteractiveRefund`, which the wallet used
 * to have to observe for itself. `spend_txid` survives as the back-compat read
 * for records written before the manager stamped anything.
 */
export const spendTxidOf = (record: RfqSwapRecord): string | undefined =>
  record.refundTxid ?? record.lockupSpendTxids?.[0] ?? profileTxid(record, SPEND_TXID)

const lightningSends = async (): Promise<RfqSwapRecord[]> =>
  (await assetSwapRepository.getAllRfqSwaps()).filter((record) => record.kind === 'lightning_send')

/** What the history needs to render one Lightning send. */
export interface LnSendView {
  rfqId: string
  fundingTxid: string
  state: RfqSwapRecord['state']
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

const viewOf = (record: RfqSwapRecord): LnSendView | undefined => {
  const fundingTxid = fundingTxidOf(record)
  if (!fundingTxid) return undefined
  return {
    rfqId: record.rfqId,
    fundingTxid,
    state: record.state,
    amount: record.amount ?? 0,
    createdAt: record.createdAt,
    spendTxid: spendTxidOf(record),
  }
}

/** The sends, for the row builder. */
export const lnSendViews = async (): Promise<LnSendView[]> => {
  try {
    return (await lightningSends()).flatMap((record) => viewOf(record) ?? [])
  } catch (err) {
    consoleError(err, 'error reading lightning send swap records')
    return []
  }
}

/**
 * Every stored RFQ swap, as `swapActivityResolver` wants them.
 *
 * `rfqSwapActivityInputs` does the work: the record's own `fundingTxid` and
 * `refundTxid`, the corridor handler's `activityTxids` — so no corridor
 * knowledge lives here — the manager's stamped `lockupSpendTxids`, and one
 * lockup read only for what none of those can answer.
 *
 * **One txid it cannot see, and the reason it stays here.** `spend_txid` is the
 * solver-pushed refund this wallet observed for itself, and it cannot move onto
 * the record's `lockupSpendTxids` where the reader would find it:
 * `updateRfqSwapRecord` strips that field and refills it from the live swap, so
 * a value written here would survive exactly until the manager's next pass.
 * `profile` is the half that survives, which is why the key was put there.
 *
 * So it is merged in afterwards — for `lightning_send` only, which is this
 * file's own corridor, reading this file's own key. Nothing here interprets a
 * profile it does not own, which is the rule `rfqCorridors.ts` exists to keep.
 *
 * Named only for a swap that came BACK. A settled send's spend is the solver's
 * claim: it pays the solver, so it is not in this wallet's history and grouping
 * against it would group nothing.
 */
export const swapActivityInputs = async (indexer?: LockupSpendIndexer): Promise<SwapActivityInput[]> => {
  try {
    const [inputs, records] = await Promise.all([
      rfqSwapActivityInputs({ repository: assetSwapRepository, indexer }),
      assetSwapRepository.getAllRfqSwaps(),
    ])
    return inputs.map((input) => {
      if (input.kind !== 'lightning_send' || input.state !== 'refunded') return input
      const record = records.find((stored) => stored.rfqId === input.rfqId)
      const spendTxid = record && profileTxid(record, SPEND_TXID)
      if (!spendTxid || input.txids.includes(spendTxid)) return input
      return { ...input, txids: [...input.txids, spendTxid] }
    })
  } catch (err) {
    consoleError(err, 'error reading swap records for activity grouping')
    return []
  }
}
