/**
 * The store behind the onchain-send leg, in the same repository the Lightning
 * sends use. `lnSendRecords.ts` owns the generic half — reading, writing, and
 * the manager's `saveSwap` — so this file is only what is different about
 * `arkade:BTC -> onchain:BTC`.
 *
 * What is different is that this corridor's second contract has nowhere else
 * to live. The Arkade lockup gets a contract row, so `rebuildRfqSwap` can
 * derive it back from the wallet's own contract store; the L1 HTLC is a
 * Bitcoin output, not an Arkade artifact, and `OnchainHtlc` exposes only
 * derived values — never the keys it was built from. `onchainSendProfile` is
 * the package's own mapper for exactly that, and skipping it in favour of
 * copying fields by hand is how a restored swap ends up watching an address
 * nobody funded (see its docstring: the renames are not cosmetic).
 *
 * Persisting all of this BEFORE funding is the obligation `requestOnchainSend`
 * states in capitals: this wallet must claim the L1 fill itself, and a record
 * that did not survive the funding cannot be claimed from.
 */
import { ArkAddress, type ProvisionedClaimSecret, type VHTLC } from '@arkade-os/sdk'
import {
  createRfqSwapRecord,
  isRfqSwapTerminal,
  lockupContractParams,
  onchainSendProfile,
  rebuildRfqSwap,
  rfqSecretsProfile,
  shouldRetainRfqSwap,
  type LockupContractReader,
  type OnchainHtlc,
  type OnchainHtlcParams,
  type OnchainNetwork,
  type PersistableRfqSwap,
  type RfqSwapRecord,
} from '@arkade-os/swap'
import { hex } from '@scure/base'
import { CLAIM_PAYOUT_SCRIPT } from './onchainPayout'
import { consoleError } from './logs'
import { assetSwapRepository } from './swapRepository'

/** What the quote knew and nothing afterwards can give back. All public:
 * `secrets` is a descriptor for recovering the sender key and the preimage,
 * never key material — see `requestOnchainSend`. */
export interface OnchainSendRecordFacts {
  /** `sha256(P)`, hex. The SAME hash both legs carry: one P unlocks both. */
  paymentHash: string
  /** The ARKADE lockup's `refund_locktime`, unix seconds. Not the L1 one. */
  refundLocktime: number
  secrets: ProvisionedClaimSecret
  /** The Arkade covenant. Without it the manager can only poll. */
  script: InstanceType<typeof VHTLC.ScriptV2>
  /**
   * The RECIPIENT's L1 output script — where the claim pays.
   *
   * A wallet-private profile key, because the package has none: the claim
   * transaction's output is the spender's own choice and nothing in
   * `OnchainSendProfile`, the quote, or the HTLC records it. It has to be here
   * because the claim can run in a later process, and the only alternative a
   * claim-time derivation could reach is this wallet's own address — which
   * would quietly turn a payment into a transfer to self.
   */
  payoutPkScript: Uint8Array
  /** The expected L1 fill — what this wallet has to watch and claim. */
  htlc: OnchainHtlc
  /** The inputs the HTLC was built from. Nothing else gives them back. */
  htlcParams: OnchainHtlcParams
  l1Network: OnchainNetwork
  minConfirmations: number
}

export interface OnchainSendRecordInput extends OnchainSendRecordFacts {
  rfqId: string
  /** The Arkade address that was funded — the lockup covenant. */
  lockupAddress: string
  /** Sats the lockup was funded with. */
  amount: number
  /**
   * The tx the wallet signed to fund it — absent on the record written BEFORE
   * funding.
   *
   * That record is not an optimisation. `requestOnchainSend` states the
   * obligation in capitals: this corridor's L1 claim is the wallet's own, and
   * everything needed to make it is in this record and nowhere else. A store
   * that only learns about the swap once the funding transaction came back has
   * a window in which the lockup is funded and the HTLC unclaimable, and the
   * width of that window is however long a tab takes to close.
   */
  fundingTxid?: string
}

/** The live swap the manager drives, for a send just funded. */
export const onchainSendSwap = (
  input: OnchainSendRecordInput,
  nowSeconds = Math.floor(Date.now() / 1000),
): PersistableRfqSwap => ({
  kind: 'onchain_send',
  rfqId: input.rfqId,
  state: 'pending',
  lockupPkScript: input.script.pkScript,
  lockup: { script: input.script, address: input.lockupAddress },
  paymentHash: input.paymentHash,
  refundLocktime: input.refundLocktime,
  htlc: input.htlc,
  minConfirmations: input.minConfirmations,
  createdAt: nowSeconds,
  updatedAt: nowSeconds,
})

/** Its first record. `rfqSecretsProfile` first, then the corridor's own half
 * through the package's mapper — the uniform rule `rfqCorridors.ts` keeps. */
export const onchainSendSwapRecord = (input: OnchainSendRecordInput, nowSeconds?: number): RfqSwapRecord =>
  createRfqSwapRecord(
    {
      kind: 'onchain_send',
      lockupAddress: input.lockupAddress,
      profile: {
        ...rfqSecretsProfile(input.secrets, input.paymentHash),
        ...onchainSendProfile(input),
        [CLAIM_PAYOUT_SCRIPT]: hex.encode(input.payoutPkScript),
      },
      amount: input.amount,
      ...(input.fundingTxid ? { fundingArkTxid: input.fundingTxid } : {}),
    },
    onchainSendSwap(input, nowSeconds),
  )

const onchainSends = async (): Promise<RfqSwapRecord[]> =>
  (await assetSwapRepository.getAllRfqSwaps()).filter((record) => record.kind === 'onchain_send')

/**
 * A record that was reserved and then never funded.
 *
 * The one question `reserveOnchainSend`'s ordering creates and nothing else can
 * answer. A record with no funding txid has two possible histories that need
 * opposite treatment — the lockup WAS funded and the second write never landed,
 * or it was never funded at all — and only the chain distinguishes them, so a
 * caller with no chain reader gets `false` and keeps everything. A record that
 * already names its funding transaction is never asked about: it is funded by
 * construction, and the read would be a round trip for a known answer.
 *
 * Deliberately conservative: anything other than a successful lookup returning
 * no outputs keeps the record — a failed lookup included — because dropping a
 * funded one abandons a real claim.
 */
export const isUnfundedReservation = async (
  record: Pick<RfqSwapRecord, 'fundingArkTxid' | 'lockupAddress'>,
  funded?: (lockupPkScript: Uint8Array) => Promise<unknown[]>,
): Promise<boolean> => {
  if (record.fundingArkTxid || !funded) return false
  try {
    return (await funded(ArkAddress.decode(record.lockupAddress).pkScript)).length === 0
  } catch (err) {
    // A lookup that failed is not evidence of anything, and it must not
    // propagate: `restoreOnchainSendSwaps` runs inside the provider's
    // `Promise.all`, so a rejection here stops `RfqSwapManager.start` from
    // running at all — every swap on both send legs, including funded ones
    // waiting on an L1 claim. An esplora blip at startup would cost far more
    // than the stale row this check exists to avoid.
    consoleError(err, `cannot tell whether onchain send ${record.lockupAddress} was funded`)
    return false
  }
}

/**
 * The stored onchain sends, rebuilt into the live swaps `RfqSwapManager.start`
 * takes. Same shape as `restoreLnSendSwaps`: prune terminal records past their
 * retention window, skip the terminal ones that remain, and skip — never
 * delete — a record whose covenant is no longer in the contract store, because
 * the row it renders is still the history of a real payment.
 *
 * One thing this corridor has that the Lightning leg does not: a record with no
 * funding txid at all. `reserveOnchainSend` writes it BEFORE the lockup is
 * funded, deliberately, so a crash between the write and the funding leaves one
 * behind. Two cases hide under that, and they need opposite treatment — the
 * lockup WAS funded and the second write never landed (must be monitored, this
 * is the whole reason the record is written first), or it was never funded at
 * all (must not be, or the user gets a "Pending" row for a payment they never
 * made, watched until the refund locktime prunes it).
 *
 * Time cannot tell them apart, so `funded` is asked instead: a lockup with no
 * VTXO was never paid. Only records missing a funding txid pay for that read.
 * Omit `funded` and the old behaviour returns — every record is kept — which is
 * what a caller with no indexer should get.
 */
export const restoreOnchainSendSwaps = async (
  contracts: LockupContractReader,
  funded?: (lockupPkScript: Uint8Array) => Promise<unknown[]>,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<PersistableRfqSwap[]> => {
  let records: RfqSwapRecord[]
  try {
    records = await onchainSends()
  } catch (err) {
    consoleError(err, 'error reading onchain send swap records')
    return []
  }

  const live: PersistableRfqSwap[] = []
  for (const record of records) {
    if (!shouldRetainRfqSwap(record, nowSeconds)) {
      await assetSwapRepository.removeRfqSwap(record.rfqId).catch((err) => consoleError(err, 'error pruning record'))
      continue
    }
    if (isRfqSwapTerminal(record.state)) continue
    // Asked BEFORE the rebuild: a record with nothing behind it is not worth a
    // contract read, and dropping it must not depend on its covenant still
    // being in the store.
    if (await isUnfundedReservation(record, funded)) {
      await assetSwapRepository
        .removeRfqSwap(record.rfqId)
        .catch((err) => consoleError(err, 'error dropping an unfunded onchain send'))
      continue
    }
    try {
      live.push(rebuildRfqSwap(record, await lockupContractParams(contracts, record.lockupAddress)))
    } catch (err) {
      consoleError(err, `cannot rebuild onchain send swap ${record.rfqId}`)
    }
  }
  return live
}
