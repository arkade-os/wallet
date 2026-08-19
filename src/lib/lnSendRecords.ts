/**
 * The store behind the Lightning-send leg: `@arkade-os/swap`'s own RFQ swap
 * records, in the repository the asset swaps already use.
 *
 * The record is the ONE place a send's outcome lives. `RfqSwapManager` owns the
 * state on it — it reads the lockup's fate off the chain, pushes the refund
 * when the solver never acts, and calls back to persist — and everything the
 * wallet shows is derived from that: the activity grouping, the row's label,
 * the receipt's two txids. Anything this file adds is what the manager has no
 * field for, and there are exactly two of those, both under `profile`, which is
 * the corridor's own opaque half:
 *
 * - `funding_txid`. The manager watches a lockup by its script and never needs
 *   to name the transaction that filled it; grouping correlates by txid and can
 *   do nothing else.
 * - `spend_txid`. `readLockupFate` answers `returned` without naming the
 *   transaction, and `refundArkTxid` is set only for a refund the wallet itself
 *   pushed — but the ordinary failure is the solver's own
 *   `nonInteractiveRefund`, which is neither, and whose row in our history is
 *   precisely what has to group with the funding tx.
 *
 * Safe keys to add: the lightning-send corridor handler's `project()` returns
 * `{}`, so nothing overwrites them, and its `hydrate` ignores what it does not
 * know.
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
  type RfqSwapRecord,
  type SwapActivityInput,
} from '@arkade-os/swap'
import { consoleError } from './logs'
import type { Tx } from './types'
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
      profile: { ...rfqSecretsProfile(input.secrets, input.paymentHash), [FUNDING_TXID]: input.fundingTxid },
      amount: input.amount,
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

export const fundingTxidOf = (record: RfqSwapRecord): string | undefined => profileTxid(record, FUNDING_TXID)

/**
 * The tx that ended the swap, when it is one of ours.
 *
 * `refundArkTxid` first: a refund the wallet pushed is the manager's own fact,
 * written as the push lands. `spend_txid` is the fallback for the solver-pushed
 * refund the manager never names.
 */
export const spendTxidOf = (record: RfqSwapRecord): string | undefined =>
  record.refundArkTxid ?? profileTxid(record, SPEND_TXID)

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
  /** The tx that ended it, when that tx is one of ours. */
  spendTxid?: string
}

const viewOf = (record: RfqSwapRecord): LnSendView | undefined => {
  const fundingTxid = fundingTxidOf(record)
  if (!fundingTxid) return undefined
  return { rfqId: record.rfqId, fundingTxid, state: record.state, spendTxid: spendTxidOf(record) }
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
 * The sends, as `swapActivityResolver` wants them.
 *
 * The spend is named only for a swap that came BACK. A settled send's spend is
 * the solver's claim: it pays the solver, so it is not in this wallet's history
 * and grouping against it would group nothing.
 */
export const lnSendActivityInputs = async (): Promise<SwapActivityInput[]> => {
  try {
    return (await lightningSends()).flatMap((record) => {
      const view = viewOf(record)
      if (!view) return []
      const refundTxid = record.state === 'refunded' ? view.spendTxid : undefined
      return [
        {
          rfqId: record.rfqId,
          kind: 'lightning_send' as const,
          state: record.state,
          txids: [view.fundingTxid, ...(refundTxid ? [refundTxid] : [])],
        },
      ]
    })
  } catch (err) {
    consoleError(err, 'error reading lightning send swap records')
    return []
  }
}

/**
 * Put each send's record on its history row.
 *
 * The rows come from `getTxHistory`, which knows only what the chain says: a
 * Lightning send looks like any other outgoing payment there, and the refund
 * that may follow it like any other incoming one. This is what makes the funding
 * row a swap — matched on the funding txid, the one handle both sides share.
 *
 * Pure, and a no-op without records, so the ordinary wallet pays nothing for it.
 */
export const graftLnSends = (txs: Tx[], lnSends: LnSendView[]): Tx[] => {
  if (lnSends.length === 0) return txs
  const byFunding = new Map(lnSends.map((view) => [view.fundingTxid, view]))
  return txs.map((tx) => {
    const view = byFunding.get(tx.redeemTxid)
    return view
      ? { ...tx, lnSwap: { state: view.state, fundingTxid: view.fundingTxid, spendTxid: view.spendTxid } }
      : tx
  })
}
