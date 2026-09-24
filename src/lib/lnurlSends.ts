import {
  lnurlQuoteMeta,
  mergeSentPayment,
  sentActivityResolver,
  type SentPayment,
} from '@arkade-os/lnurl-client/arkade'
import type { ActivityResolver, PaymentHandle, RouteQuote } from '@arkade-os/sdk'
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
  const paidTo = lnurlQuoteMeta(quote)?.target ?? target
  handle.subscribe(({ result }) => {
    if (!result?.txid) return
    save({
      txid: result.txid,
      target: paidTo,
      railId: quote.railId,
      amountSat: quote.amount,
      feeSat: quote.fee,
      createdAt,
      ...(result.swapId ? { swapId: result.swapId } : {}),
      ...(result.preimage ? { preimage: result.preimage } : {}),
    })
  })
}

export const createSentActivityResolver = (): ActivityResolver => sentActivityResolver(lnurlSends)

/** Records only the confirmation outcome; a send with no matching row (never
 *  named a txid) has nothing to attach it to. */
export const markLnurlReceiverConfirmed = (txid: string, confirmed: boolean): void => {
  const existing = lnurlSends().find((s) => s.txid === txid)
  if (!existing) return
  save({ ...existing, receiverConfirmed: confirmed })
}
