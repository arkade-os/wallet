import {
  createLnurlPaymentRepository as createRepository,
  clearLnurlPaymentsForReset as clearForReset,
  type LnurlPaymentStore,
  type LnurlPaymentRepository,
  type LnurlPaymentWatermarkStore,
  type PaymentSyncStore,
  type StoredPayment,
} from '@arkade-os/lnurl-client'
import { createIndexedDbLnurlPaymentStore } from '@arkade-os/lnurl-client/browser'
import { lnurlActivityResolver } from '@arkade-os/lnurl-client/arkade'
import type { ActivityResolver } from '@arkade-os/sdk'
import { getStorageItem } from './storage'
import { LNURL_WATERMARKS_STORAGE_KEY } from './storageKeys'

const indexedDbLnurlPaymentStore = createIndexedDbLnurlPaymentStore()
const watermarkEntryKey = (baseUrl: string, lightningAddress: string): string => `${baseUrl}|${lightningAddress}`

const readWatermarkMap = (): Record<string, number> =>
  getStorageItem<Record<string, number>>(LNURL_WATERMARKS_STORAGE_KEY, {}, (value) => {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, number>) : {}
  })

const localStorageWatermarks: LnurlPaymentWatermarkStore = {
  read: async (baseUrl, address) => readWatermarkMap()[watermarkEntryKey(baseUrl, address)],
  write: async (baseUrl, address, since) => {
    const stored = readWatermarkMap()
    stored[watermarkEntryKey(baseUrl, address)] = since
    localStorage.setItem(LNURL_WATERMARKS_STORAGE_KEY, JSON.stringify(stored))
  },
  clear: async () => localStorage.removeItem(LNURL_WATERMARKS_STORAGE_KEY),
}

export const createLnurlPaymentRepository = (
  store: LnurlPaymentStore = indexedDbLnurlPaymentStore,
  watermarks: LnurlPaymentWatermarkStore = localStorageWatermarks,
): LnurlPaymentRepository => createRepository(store, watermarks)

export const lnurlPaymentRepository = createLnurlPaymentRepository()

export const clearLnurlPaymentsForReset = (
  repository: ReturnType<typeof createLnurlPaymentRepository> = lnurlPaymentRepository,
): Promise<void> => clearForReset(repository)

/** Sync can write after construction; prepare must read the current receive history. */
export const createLnurlActivityResolver = (
  repository: ReturnType<typeof createLnurlPaymentRepository> = lnurlPaymentRepository,
): ActivityResolver => {
  let cache: StoredPayment[] = []
  const resolver = lnurlActivityResolver(() => cache)
  return {
    ...resolver,
    prepare: async () => {
      cache = await repository.all()
      await resolver.prepare?.()
    },
  }
}

export const lnurlPaymentSyncStore: PaymentSyncStore = lnurlPaymentRepository
