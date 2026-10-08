import {
  lnurlQuoteMeta,
  mergeSentPayment,
  sentActivityResolver,
  type SentPayment,
} from '@arkade-os/lnurl-client/arkade'
import type { ActivityResolver, PaymentHandle, RouteQuote } from '@arkade-os/sdk'
import { pendingConfirmations } from './lnurlConfirmations'
import { getStorageItem, setStorageItemSafely } from './storage'
import { LNURL_SENDS_STORAGE_KEY } from './storageKeys'

export const lnurlSends = (): SentPayment[] =>
  getStorageItem<SentPayment[]>(LNURL_SENDS_STORAGE_KEY, [], (value) => JSON.parse(value))

const save = (sent: SentPayment): void =>
  setStorageItemSafely(
    LNURL_SENDS_STORAGE_KEY,
    JSON.stringify(mergeSentPayment(lnurlSends(), sent)),
    'Failed to record lnurl send',
  )

/** Keeps listening past the funding: a swap names its preimage only at settlement. */
export const recordLnurlSend = (handle: PaymentHandle, quote: RouteQuote, target: string): void => {
  const createdAt = Date.now()
  const meta = lnurlQuoteMeta(quote)
  handle.subscribe(({ result }) => {
    if (!result?.txid) return
    save({
      txid: result.txid,
      target: meta?.target ?? target,
      railId: quote.railId,
      amountSat: quote.amount,
      feeSat: quote.fee,
      createdAt,
      ...(result.swapId ? { swapId: result.swapId } : {}),
      ...(result.preimage ? { preimage: result.preimage } : {}),
      ...(meta?.verify ? { verify: meta.verify } : {}),
      ...(meta?.verifyBatch ? { verifyBatch: meta.verifyBatch } : {}),
    })
  })
}

/** Waits on the receiver's confirmation of a send and records the outcome on its row. */
export const watchLnurlConfirmation = (txid: string, verify: string, verifyBatch?: string): void =>
  pendingConfirmations.add({
    verifyUrl: verify,
    ...(verifyBatch !== undefined ? { verifyBatch } : {}),
    onSettled: () => markLnurlReceiverConfirmed(txid, true),
    onError: () => markLnurlReceiverConfirmed(txid, false),
  })

/** Picks back up the confirmations still pending when the app last closed. */
export const resumeLnurlConfirmations = (): void => {
  for (const sent of lnurlSends()) {
    if (sent.verify && sent.receiverConfirmed === undefined)
      watchLnurlConfirmation(sent.txid, sent.verify, sent.verifyBatch)
  }
}

export const createSentActivityResolver = (): ActivityResolver => sentActivityResolver(lnurlSends)

/** Records only the confirmation outcome; a send with no matching row (never
 *  named a txid) has nothing to attach it to. */
export const markLnurlReceiverConfirmed = (txid: string, confirmed: boolean): void => {
  const existing = lnurlSends().find((s) => s.txid === txid)
  if (!existing) return
  save({ ...existing, receiverConfirmed: confirmed })
}
