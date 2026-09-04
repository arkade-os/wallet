/** The onchain-send leg's store. The L1 HTLC has no contract row to rebuild
 *  from, so `onchainSendProfile` is the only supported mapper — hand-copying its
 *  fields is how a restored swap watches an address nobody funded. */
import { ArkAddress } from '@arkade-os/sdk'
import {
  createRfqSwapRecord,
  isRfqSwapTerminal,
  lockupContractParams,
  onchainSendProfile,
  rebuildRfqSwap,
  rfqSecretsProfile,
  shouldRetainRfqSwap,
  type LockupContractReader,
  type PersistableRfqSwap,
  type RfqSwapRecord,
  type SolverOnchainSend,
} from '@arkade-os/swap'
import { hex } from '@scure/base'
import { CLAIM_PAYOUT_SCRIPT } from './onchainPayout'
import { consoleError } from './logs'
import { assetSwapRepository } from './swapRepository'

export const onchainSendSwap = (
  swap: SolverOnchainSend,
  fundingTxid?: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): PersistableRfqSwap => ({
  kind: 'onchain_send',
  rfqId: swap.rfqId,
  state: 'pending',
  lockupPkScript: swap.script.pkScript,
  lockup: { script: swap.script, address: swap.address },
  paymentHash: swap.htlcParams.paymentHash,
  refundLocktime: swap.quote.refund_locktime ?? 0,
  htlc: swap.htlc,
  minConfirmations: swap.minConfirmations,
  createdAt: nowSeconds,
  updatedAt: nowSeconds,
  ...(fundingTxid ? { fundingTxid } : {}),
})

/** Hex, because a store fed the raw `Uint8Array` returns `{"0":81,…}`. */
export const onchainSendSwapRecord = (
  swap: SolverOnchainSend,
  fundingTxid?: string,
  nowSeconds?: number,
): RfqSwapRecord =>
  createRfqSwapRecord(
    {
      kind: 'onchain_send',
      lockupAddress: swap.address,
      profile: {
        ...rfqSecretsProfile(swap.secrets, swap.htlcParams.paymentHash),
        ...onchainSendProfile(swap),
        [CLAIM_PAYOUT_SCRIPT]: hex.encode(swap.payoutPkScript),
      },
      amount: swap.fundAmount,
      ...(fundingTxid ? { fundingArkTxid: fundingTxid } : {}),
    },
    onchainSendSwap(swap, fundingTxid, nowSeconds),
  )

const onchainSends = async (): Promise<RfqSwapRecord[]> =>
  (await assetSwapRepository.getAllRfqSwaps()).filter((record) => record.kind === 'onchain_send')

/** No funding txid has two histories needing opposite treatment — funded with
 *  the second write lost, or never funded — and only the chain tells them
 *  apart. */
export const isUnfundedReservation = async (
  record: Pick<RfqSwapRecord, 'fundingArkTxid' | 'lockupAddress'>,
  funded?: (lockupPkScript: Uint8Array) => Promise<unknown[]>,
): Promise<boolean> => {
  if (record.fundingArkTxid || !funded) return false
  try {
    return (await funded(ArkAddress.decode(record.lockupAddress).pkScript)).length === 0
  } catch (err) {
    // Must not propagate: it would stop `start` for every swap on both legs.
    consoleError(err, `cannot tell whether onchain send ${record.lockupAddress} was funded`)
    return false
  }
}

/** A record whose covenant has left the store is skipped, never deleted. */
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
