import { createLnurlSendTracker, sentActivityResolver, type SentPayment } from '@arkade-os/lnurl-client/arkade'
import type { ActivityResolver } from '@arkade-os/sdk'
import { pendingConfirmations } from './lnurlConfirmations'
import { consoleError } from './logs'
import { getStorageItem } from './storage'
import { LNURL_SENDS_STORAGE_KEY } from './storageKeys'

export const lnurlSends = (): SentPayment[] =>
  getStorageItem<SentPayment[]>(LNURL_SENDS_STORAGE_KEY, [], (value) => {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  })

const listeners = new Set<() => void>()
export const subscribeLnurlSends = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const tracker = createLnurlSendTracker(
  {
    read: lnurlSends,
    write: (records) => {
      localStorage.setItem(LNURL_SENDS_STORAGE_KEY, JSON.stringify(records))
      for (const listener of listeners) listener()
    },
  },
  { confirmations: pendingConfirmations, onError: (error) => consoleError(error, 'Failed to record lnurl send') },
)

export const recordLnurlSend = tracker.record
export const watchLnurlConfirmation = tracker.watch
export const resumeLnurlConfirmations = tracker.resume
export const markLnurlReceiverConfirmed = tracker.mark
export const forgetLnurlSends = tracker.forget
export const createSentActivityResolver = (): ActivityResolver => sentActivityResolver(lnurlSends)
