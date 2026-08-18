/**
 * The wallet's RFQ swap records for the Lightning send leg.
 *
 * Written when the covenant is funded, kept current from the chain, and read
 * back by `@arkade-os/swap`'s own `swapActivityResolver` — which is the point
 * of storing them at all. A Lightning send is two transactions that the tx
 * history cannot correlate on its own: the funding tx the wallet signed, and
 * the spend that ended the swap. When that spend is the refund, it lands in
 * history as an unrelated `Received` row, and the pair reads as a payment that
 * went out plus money that appeared from nowhere. The record is what ties them
 * into one activity.
 *
 * The records go in the repository `@arkade-os/swap` already gives us — the
 * same one the asset swaps use, which carries an `rfqSwaps` store next to
 * them. No new storage, and the shapes are the package's own, so adopting
 * `RfqSwapManager` later means driving these records rather than migrating
 * them.
 *
 * The wallet does NOT run that manager for this leg (see `Details.tsx`:
 * funding is acceptance and the outcome resolves without us), so the state
 * here is moved by {@link refreshLnSendStates} reading the chain, not by a
 * driver. That is why every record this file writes is complete enough to be
 * rebuilt: `profile.signer` and `profile.hashlock` are written with the
 * package's own `rfqSecretsProfile`, so a later manager can pick these up
 * instead of finding half a record.
 */
import { ArkAddress, RestIndexerProvider, type ProvisionedKey } from '@arkade-os/sdk'
import {
  createRfqSwapRecord,
  isRfqSwapTerminal,
  rfqSecretsProfile,
  type RfqSwapRecord,
  type SwapActivityInput,
} from '@arkade-os/swap'
import { hex } from '@scure/base'
import { lnSendSpender } from './lnSwap'
import { consoleError } from './logs'
import { assetSwapRepository } from './swapRepository'

/**
 * Where the funding txid lives on the record.
 *
 * `RfqSwapRecord` has no field for it: the manager watches the lockup by its
 * script and never needs to name the tx that filled it. Activity grouping does
 * — it correlates by txid — so it rides in `profile`, which is the corridor's
 * own opaque half. Safe to add a key of ours: the lightning-send corridor
 * handler's `project()` returns `{}`, so nothing overwrites it.
 */
const FUNDING_TXID = 'funding_txid'

/** What the record needs and neither the funding tx nor the covenant can give
 * back. All public: `secrets` is a descriptor for recovering the sender key,
 * never key material — see `requestLightningSend`. */
export interface LnSendRecordSecrets {
  /** `sha256(P)`, hex — the quote's `payment_hash`. */
  paymentHash: string
  /** The quote's `refund_locktime`, unix seconds. */
  refundLocktime: number
  secrets: ProvisionedKey
}

export interface LnSendRecordInput extends LnSendRecordSecrets {
  rfqId: string
  /** The Arkade address that was funded — the lockup covenant. */
  lockupAddress: string
  /** That covenant's pkScript, hex. */
  swapPkScript: string
  /** Sats the lockup was funded with. */
  amount: number
  /** The tx the wallet signed to fund it. */
  fundingTxid: string
}

/** The record for one funded Lightning send, in the package's own shape. */
export const lnSendSwapRecord = (input: LnSendRecordInput, nowSeconds = Math.floor(Date.now() / 1000)): RfqSwapRecord =>
  createRfqSwapRecord(
    {
      kind: 'lightning_send',
      lockupAddress: input.lockupAddress,
      profile: { ...rfqSecretsProfile(input.secrets, input.paymentHash), [FUNDING_TXID]: input.fundingTxid },
      amount: input.amount,
    },
    {
      kind: 'lightning_send',
      rfqId: input.rfqId,
      state: 'pending',
      lockupPkScript: hex.decode(input.swapPkScript),
      paymentHash: input.paymentHash,
      refundLocktime: input.refundLocktime,
      createdAt: nowSeconds,
      updatedAt: nowSeconds,
    },
  )

/**
 * Record a funded Lightning send.
 *
 * Best-effort on purpose, and called after the funding tx is away: the payment
 * is committed either way, and a storage failure must not read to the user as
 * a send that did not happen. What is lost is the grouping, not the money.
 */
export const saveLnSendRecord = async (input: LnSendRecordInput): Promise<void> => {
  try {
    await assetSwapRepository.saveRfqSwap(lnSendSwapRecord(input))
  } catch (err) {
    consoleError(err, 'error recording lightning send swap')
  }
}

const fundingTxidOf = (record: RfqSwapRecord): string | undefined => {
  const txid = record.profile[FUNDING_TXID]
  return typeof txid === 'string' && txid ? txid : undefined
}

/** The covenant's pkScript, hex, from the address the record stores it under.
 * Derived rather than stored a second time, for the reason `rfqRecord.ts`
 * gives: two copies of one covenant drift apart with nothing to say which is
 * right. */
const lockupPkScript = (record: RfqSwapRecord): string => hex.encode(ArkAddress.decode(record.lockupAddress).pkScript)

const lightningSends = async (): Promise<RfqSwapRecord[]> =>
  (await assetSwapRepository.getAllRfqSwaps()).filter((record) => record.kind === 'lightning_send')

/**
 * The Lightning sends, as `swapActivityResolver` wants them.
 *
 * Only two txids can ever be ours: the funding tx, and the refund when the
 * swap came back. A settled send's spend is the SOLVER's claim — it pays the
 * solver, so it is not in this wallet's history and naming it here would group
 * nothing.
 *
 * A record with no funding txid contributes nothing rather than an empty
 * group: correlation is by txid, so a group with no member is a row that
 * cannot exist.
 */
export const lnSendActivityInputs = async (): Promise<SwapActivityInput[]> => {
  try {
    return (await lightningSends()).flatMap((record) => {
      const fundingTxid = fundingTxidOf(record)
      if (!fundingTxid) return []
      const txids = [fundingTxid, ...(record.refundArkTxid ? [record.refundArkTxid] : [])]
      return [{ rfqId: record.rfqId, kind: 'lightning_send' as const, state: record.state, txids }]
    })
  } catch (err) {
    consoleError(err, 'error reading lightning send swap records')
    return []
  }
}

/**
 * Move every unresolved send to what the chain says became of its lockup.
 *
 * Reuses `lnSendSpender` rather than the package's `readLockupFate` for one
 * reason: grouping needs the refund's TXID, and only this one names the
 * spender. It costs the strength of the preimage proof — a refund is told from
 * a claim by who got paid, not by a witness that hashes to the payment hash —
 * which is the same trade the receipt screen already makes, and `paidUs` is
 * required to throw rather than answer "no" when it cannot tell.
 *
 * Terminal records are skipped, so a wallet with no swaps in flight makes no
 * indexer calls at all. Failures are per-record: one unreadable lockup leaves
 * that swap pending and the rest resolve.
 */
export const refreshLnSendStates = async (deps: {
  indexerUrl: string
  /** Must throw rather than answer `false` when it cannot tell — a wrong `no`
   * files a refund as a paid invoice. */
  paidUs: (txid: string) => Promise<boolean>
  now?: () => number
}): Promise<void> => {
  if (!deps.indexerUrl) return
  let pending: RfqSwapRecord[]
  try {
    pending = (await lightningSends()).filter((record) => !isRfqSwapTerminal(record.state))
  } catch (err) {
    consoleError(err, 'error reading lightning send swap records')
    return
  }
  if (pending.length === 0) return

  const indexer = new RestIndexerProvider(deps.indexerUrl)
  const nowSeconds = Math.floor((deps.now?.() ?? Date.now()) / 1000)

  for (const record of pending) {
    const fundingTxid = fundingTxidOf(record)
    if (!fundingTxid) continue
    try {
      const spend = await lnSendSpender(indexer, deps.paidUs, {
        fundingTxid,
        swapPkScript: lockupPkScript(record),
      })
      if (!spend) continue
      await assetSwapRepository.saveRfqSwap({
        ...record,
        // A send leg's `refunded` is the lockup coming back, not a loss — the
        // resolver's own outcome token for it, and what the row must say.
        state: spend.outcome === 'refunded' ? 'refunded' : 'settled',
        ...(spend.outcome === 'refunded' ? { refundArkTxid: spend.spentTxid } : {}),
        updatedAt: nowSeconds,
      })
    } catch (err) {
      consoleError(err, `error resolving lightning send swap ${record.rfqId}`)
    }
  }
}
