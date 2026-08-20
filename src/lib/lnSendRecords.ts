/**
 * The store behind the Lightning-send leg: `@arkade-os/swap`'s own RFQ swap
 * records, in the repository the asset swaps already use.
 *
 * The record is the ONE place a send's outcome lives. `RfqSwapManager` owns the
 * state on it — it reads the lockup's fate off the chain, pushes the refund
 * when the solver never acts, and calls back to persist — and everything the
 * wallet shows is derived from that: the activity grouping, the row's label,
 * the receipt's two txids.
 *
 * **This file used to add two keys of its own**, `funding_txid` and
 * `spend_txid`, both under `profile`, because the manager had no field for
 * either. ts-sdk#773 gave it both, so they are gone as things we WRITE:
 *
 * - `fundingArkTxid` is on the origin. The manager watches a lockup by its
 *   script and still never needs the transaction that filled it, but the record
 *   carries it now — and it has to, because grouping correlates by txid and
 *   `rfqSwapActivityInputs` reads the record's own fields. The lightning-send
 *   corridor has no `activityTxids`, so a funding txid under a wallet-private
 *   profile key is a txid the resolver cannot see.
 * - `lockupSpendArkTxids` is stamped by the manager at finalization, from the
 *   chain read that ended the swap. That covers the ordinary failure — the
 *   solver's own `nonInteractiveRefund`, which is neither a refund the wallet
 *   pushed nor something `readLockupFate` named — which is exactly the gap
 *   `spend_txid` existed to fill.
 *
 * Both old keys are still READ, so a store written by an earlier preview deploy
 * keeps its receipts and its grouping. `funding_txid` is no longer written at
 * all. `spend_txid` still is, but only as the fallback for a record the manager
 * has not stamped — see `recordEnding` in `providers/lnSwaps.tsx`, which now
 * checks the stamp before paying for an indexer lookup.
 */
import type { IWallet, ProvisionedKey, VHTLC } from '@arkade-os/sdk'
import {
  createRfqSwapRecord,
  isRfqSwapTerminal,
  lockupContractParams,
  rebuildRfqSwap,
  rfqSecretsProfile,
  rfqSignerOf,
  senderIdentityForSwapRecord,
  shouldRetainRfqSwap,
  updateRfqSwapRecord,
  type LockupContractReader,
  type PersistableRfqSwap,
  rfqSwapActivityInputs,
  type LockupSpendIndexer,
  type RfqSwapRecord,
  type SwapActivityInput,
} from '@arkade-os/swap'
import { consoleError } from './logs'
import { assetSwapRepository } from './swapRepository'

const FUNDING_TXID = 'funding_txid'
const SPEND_TXID = 'spend_txid'

/** What the quote knew and nothing afterwards can give back. All public:
 * `secrets` is a descriptor for recovering the sender key, never key material —
 * see `requestLightningSend`. */
export interface LnSendRecordFacts {
  /** `sha256(P)`, hex — the quote's `payment_hash`. */
  paymentHash: string
  /** The quote's `refund_locktime`, unix seconds. */
  refundLocktime: number
  secrets: ProvisionedKey
  /** The covenant itself. Without it the manager can only poll: it cannot
   * subscribe to the lockup, and cannot retire the contract row when the swap
   * ends. */
  script: InstanceType<typeof VHTLC.ScriptV2>
}

export interface LnSendRecordInput extends LnSendRecordFacts {
  rfqId: string
  /** The Arkade address that was funded — the lockup covenant. */
  lockupAddress: string
  /** Sats the lockup was funded with. */
  amount: number
  /** The tx the wallet signed to fund it. */
  fundingTxid: string
}

/** The live swap the manager drives, for a send just funded. */
export const lnSendSwap = (
  input: LnSendRecordInput,
  nowSeconds = Math.floor(Date.now() / 1000),
): PersistableRfqSwap => ({
  kind: 'lightning_send',
  rfqId: input.rfqId,
  state: 'pending',
  lockupPkScript: input.script.pkScript,
  lockup: { script: input.script, address: input.lockupAddress },
  paymentHash: input.paymentHash,
  refundLocktime: input.refundLocktime,
  createdAt: nowSeconds,
  updatedAt: nowSeconds,
})

/** Its first record, in the package's own shape. */
export const lnSendSwapRecord = (input: LnSendRecordInput, nowSeconds?: number): RfqSwapRecord =>
  createRfqSwapRecord(
    {
      kind: 'lightning_send',
      lockupAddress: input.lockupAddress,
      profile: rfqSecretsProfile(input.secrets, input.paymentHash),
      amount: input.amount,
      // The record's OWN field, not a profile key of ours. `rfqSwapActivityInputs`
      // reads this and never looks at `profile` for a send — the corridor handler
      // has no `activityTxids` — so a funding txid parked under a wallet-private
      // key groups nothing at all.
      fundingArkTxid: input.fundingTxid,
    },
    lnSendSwap(input, nowSeconds),
  )

export const saveRecord = async (record: RfqSwapRecord): Promise<void> => assetSwapRepository.saveRfqSwap(record)

export const readRecord = async (rfqId: string): Promise<RfqSwapRecord | undefined> =>
  (await assetSwapRepository.getAllRfqSwaps()).find((record) => record.rfqId === rfqId)

/**
 * Persist a pass that changed something — the manager's `saveSwap`.
 *
 * The origin half is carried through from the stored record, `profile`
 * included, which is where the two txids live. A swap the store has never seen
 * cannot be written from the live record alone — it holds no origin — so it is
 * reported rather than written half-formed.
 */
export const saveSwapUpdate = async (swap: PersistableRfqSwap): Promise<void> => {
  const prior = await readRecord(swap.rfqId)
  if (!prior) {
    consoleError(new Error(`no stored record for rfq ${swap.rfqId}`), 'skipping swap update')
    return
  }
  await saveRecord(updateRfqSwapRecord(prior, swap))
}

const profileTxid = (record: RfqSwapRecord, key: string): string | undefined => {
  const txid = record.profile[key]
  return typeof txid === 'string' && txid ? txid : undefined
}

/**
 * The tx that filled the lockup.
 *
 * `fundingArkTxid` is where it lives now. `funding_txid` is read only for
 * records written before it moved there — a preview deploy's store, not a
 * shape anything still writes.
 */
export const fundingTxidOf = (record: RfqSwapRecord): string | undefined =>
  record.fundingArkTxid ?? profileTxid(record, FUNDING_TXID)

/**
 * The tx that ended the swap, when it is one of ours.
 *
 * `refundArkTxid` first: a refund the wallet pushed is the manager's own fact,
 * written as the push lands. Then `lockupSpendArkTxids`, which the manager now
 * stamps at finalization from the chain read that ended the swap — that is the
 * ordinary case, the solver's own `nonInteractiveRefund`, which the wallet used
 * to have to observe for itself. `spend_txid` survives as the back-compat read
 * for records written before the manager stamped anything.
 */
export const spendTxidOf = (record: RfqSwapRecord): string | undefined =>
  record.refundArkTxid ?? record.lockupSpendArkTxids?.[0] ?? profileTxid(record, SPEND_TXID)

/** Note the transaction that spent a lockup. A swap already carrying one is
 * left alone, so a re-observation cannot rewrite what was recorded first. */
export const recordSpendTxid = async (rfqId: string, spendTxid: string): Promise<void> => {
  const record = await readRecord(rfqId)
  if (!record || spendTxidOf(record)) return
  await saveRecord({ ...record, profile: { ...record.profile, [SPEND_TXID]: spendTxid } })
}

const lightningSends = async (): Promise<RfqSwapRecord[]> =>
  (await assetSwapRepository.getAllRfqSwaps()).filter((record) => record.kind === 'lightning_send')

/**
 * The stored sends, rebuilt into the live swaps `RfqSwapManager.start` takes.
 *
 * Prunes on the way through, which is the consumer's job and nothing in the
 * package does for us: terminal records past their retention window are
 * dropped, live ones always kept.
 *
 * The covenant is not on the record — it lives in the lockup's contract row —
 * so a wallet whose contract store no longer holds that row cannot rebuild the
 * swap. Such a record is skipped, not deleted: it is still the history of a
 * real payment, and the row it renders needs no covenant.
 */
export const restoreLnSendSwaps = async (
  contracts: LockupContractReader,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<PersistableRfqSwap[]> => {
  let records: RfqSwapRecord[]
  try {
    records = await lightningSends()
  } catch (err) {
    consoleError(err, 'error reading lightning send swap records')
    return []
  }

  const live: PersistableRfqSwap[] = []
  for (const record of records) {
    if (!shouldRetainRfqSwap(record, nowSeconds)) {
      await assetSwapRepository.removeRfqSwap(record.rfqId).catch((err) => consoleError(err, 'error pruning record'))
      continue
    }
    // Nothing left to drive: a pass would only re-read a lockup whose story is
    // over.
    if (isRfqSwapTerminal(record.state)) continue
    try {
      live.push(rebuildRfqSwap(record, await lockupContractParams(contracts, record.lockupAddress)))
    } catch (err) {
      consoleError(err, `cannot rebuild lightning send swap ${record.rfqId}`)
    }
  }
  return live
}

/** The `sender` signer for a refund push, from the record's own descriptor.
 * Resolves against the seed and makes no network call. */
export const lnSendRefundSigner = async (wallet: IWallet, rfqId: string) => {
  const record = await readRecord(rfqId)
  if (!record) throw new Error(`no stored record for rfq ${rfqId}`)
  return senderIdentityForSwapRecord(wallet, rfqSignerOf(record) ?? {})
}

/** Whether this wallet could push that refund at all — asked every pass, so a
 * swap nobody can refund says so while the solver can still act. */
export const canRefundLnSend = async (
  wallet: IWallet,
  rfqId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  try {
    await lnSendRefundSigner(wallet, rfqId)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) }
  }
}

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
 * `rfqSwapActivityInputs` does the work: the record's own `fundingArkTxid` and
 * `refundArkTxid`, the corridor handler's `activityTxids` — so no corridor
 * knowledge lives here — the manager's stamped `lockupSpendArkTxids`, and one
 * lockup read only for what none of those can answer.
 *
 * **One txid it cannot see, and the reason it stays here.** `spend_txid` is the
 * solver-pushed refund this wallet observed for itself, and it cannot move onto
 * the record's `lockupSpendArkTxids` where the reader would find it:
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
