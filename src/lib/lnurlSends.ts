import { createLnurlSendTracker, sentActivityResolver } from '@arkade-os/lnurl-client/arkade'
import { createLocalStorageLnurlSentPaymentStore } from '@arkade-os/lnurl-client/browser'
import type { ActivityResolver } from '@arkade-os/sdk'
import { pendingConfirmations } from './lnurlConfirmations'
import { consoleError } from './logs'
import { LNURL_SENDS_STORAGE_KEY } from './storageKeys'

const tracker = createLnurlSendTracker(createLocalStorageLnurlSentPaymentStore(LNURL_SENDS_STORAGE_KEY), {
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
