import {
  createLnurlSendTracker,
  mergeSentPayment,
  sentActivityResolver,
  type SentPayment,
} from '@arkade-os/lnurl-client/arkade'
import { createLocalStorageLnurlSentPaymentStore } from '@arkade-os/lnurl-client/browser'
import type { ActivityResolver } from '@arkade-os/sdk'
import { pendingConfirmations } from './lnurlConfirmations'
import { consoleError } from './logs'
import { LNURL_SENDS_STORAGE_KEY } from './storageKeys'

const store = createLocalStorageLnurlSentPaymentStore(LNURL_SENDS_STORAGE_KEY)
const tracker = createLnurlSendTracker(store, {
  confirmations: pendingConfirmations,
  onError: (error) => consoleError(error, 'Failed to record lnurl send'),
})

export const lnurlSends = tracker.all
export const subscribeLnurlSends = tracker.subscribe
export const recordLnurlSend = tracker.record
export const watchLnurlConfirmation = tracker.watch
export const resumeLnurlConfirmations = tracker.resume
export const markLnurlReceiverConfirmed = tracker.mark
export const forgetLnurlSends = tracker.forget
export const createSentActivityResolver = (): ActivityResolver => sentActivityResolver(lnurlSends)

/** An LNURL invoice paid by a payment swap has no router handle for `recordLnurlSend` to follow. */
export const recordLnurlInvoiceSend = (sent: SentPayment): void => {
  try {
    store.write(mergeSentPayment(store.read(), sent))
  } catch (error) {
    consoleError(error, 'Failed to record lnurl send')
    return
  }
  if (sent.verify) watchLnurlConfirmation(sent.txid, sent.verify, sent.verifyBatch, sent.createdAt, sent.expect)
}
