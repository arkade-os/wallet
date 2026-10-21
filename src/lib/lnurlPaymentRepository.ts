import {
  createLnurlPaymentRepository as createRepository,
  clearLnurlPaymentsForReset as clearForReset,
  type LnurlPaymentStore,
  type LnurlPaymentRepository,
  type LnurlPaymentWatermarkStore,
  type PaymentSyncStore,
} from '@arkade-os/lnurl-client'
import {
  createIndexedDbLnurlPaymentStore,
  createLocalStorageLnurlWatermarkStore,
} from '@arkade-os/lnurl-client/browser'
import { lnurlActivityResolver } from '@arkade-os/lnurl-client/arkade'
import type { ActivityResolver } from '@arkade-os/sdk'
import { LNURL_WATERMARKS_STORAGE_KEY } from './storageKeys'

const indexedDbLnurlPaymentStore = createIndexedDbLnurlPaymentStore()
const localStorageWatermarks = createLocalStorageLnurlWatermarkStore(LNURL_WATERMARKS_STORAGE_KEY)

export const createLnurlPaymentRepository = (
  store: LnurlPaymentStore = indexedDbLnurlPaymentStore,
  watermarks: LnurlPaymentWatermarkStore = localStorageWatermarks,
): LnurlPaymentRepository => createRepository(store, watermarks)

export const lnurlPaymentRepository = createLnurlPaymentRepository()

export const clearLnurlPaymentsForReset = (
  repository: ReturnType<typeof createLnurlPaymentRepository> = lnurlPaymentRepository,
): Promise<void> => clearForReset(repository)

export const createLnurlActivityResolver = (
  repository: ReturnType<typeof createLnurlPaymentRepository> = lnurlPaymentRepository,
): ActivityResolver => lnurlActivityResolver(() => repository.all())

export const lnurlPaymentSyncStore: PaymentSyncStore = lnurlPaymentRepository
