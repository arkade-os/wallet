import type { ArkTransaction } from '@arkade-os/sdk'
import type { TransactionActivityMetadata } from './storage'
import type { Tx } from './types'

/** The key `buildActivities` buckets untagged rows on, and the one the swap
 * resolvers correlate against. */
export const txidOfArkTransaction = (tx: ArkTransaction): string =>
  tx.key.arkTxid || tx.key.commitmentTxid || tx.key.boardingTxid

/** Local metadata is passed in rather than read here: the activity path runs
 * this inside a `useMemo` and owns its snapshot. */
export const arkTransactionToTx = (tx: ArkTransaction, activityMetadata?: TransactionActivityMetadata): Tx => {
  const date = new Date(tx.createdAt)
  const unix = Math.floor(date.getTime() / 1000)
  const { key, settled, type, amount } = tx
  const explorable = key.boardingTxid ? key.boardingTxid : key.commitmentTxid ? key.commitmentTxid : undefined
  const assets = tx.assets?.map((a) => ({ assetId: a.assetId, amount: a.amount }))
  return {
    amount: Math.abs(amount),
    assetAction: activityMetadata?.assetAction,
    assets,
    boardingTxid: key.boardingTxid,
    destination: type === 'SENT' ? activityMetadata?.destination : undefined,
    lnSend: type === 'SENT' ? activityMetadata?.lnSend : undefined,
    redeemTxid: key.arkTxid,
    roundTxid: key.commitmentTxid,
    createdAt: unix,
    explorable,
    networkFee: activityMetadata?.networkFee,
    preconfirmed: !settled,
    settled: type === 'SENT' ? true : settled, // show all sent tx as settled
    type: type.toLowerCase(),
  }
}

// sort by date, if have same date, put 'received' txs first
export const sortLocalTxs = (txs: Tx[]): Tx[] =>
  [...txs].sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.type === 'sent' ? -1 : 1
    if (b.createdAt === 0) return 1 // tx with no date go to the top
    if (a.createdAt === 0) return -1 // tx with no date go to the top
    return a.createdAt > b.createdAt ? -1 : 1
  })
