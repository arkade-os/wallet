import { getStorageItem, setStorageItemSafely } from './storage'
import { LNURL_WATERMARKS_STORAGE_KEY } from './storageKeys'

export interface StoredLnurlPayment {
  /** `${baseUrl}|${identifier}` — identifiers are unique per server, not globally. */
  key: string
  baseUrl: string
  domain: string
  lightningAddress: string
  /** paymentHash for bolt11, verifyId for destination. */
  identifier: string
  kind: 'bolt11' | 'destination'
  settled: boolean
  amountMsat: number | null
  createdAt: number
  settledAt: number | null
  /** RFQ id, when this was an offline swap. */
  swapId: string | null
  /** Arkade txid, once observed. The correlation key for the resolver. */
  paymentReference: string | null
}

/** The persistence primitive, injectable so tests need no IndexedDB. */
export interface LnurlPaymentStore {
  read(): Promise<StoredLnurlPayment[]>
  write(records: StoredLnurlPayment[]): Promise<void>
}

export const lnurlPaymentKey = (baseUrl: string, identifier: string): string => `${baseUrl}|${identifier}`

const LNURL_PAYMENTS_DB = 'arkade-lnurl-payments'
const LNURL_PAYMENTS_STORE = 'payments'

export const createIndexedDbLnurlPaymentStore = (
  dbName = LNURL_PAYMENTS_DB,
  storeName = LNURL_PAYMENTS_STORE,
): LnurlPaymentStore => {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName, { keyPath: 'key' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  return {
    read: () =>
      open().then(
        (db) =>
          new Promise<StoredLnurlPayment[]>((resolve, reject) => {
            const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
            request.onsuccess = () => {
              db.close()
              resolve(request.result as StoredLnurlPayment[])
            }
            request.onerror = () => reject(request.error)
          }),
      ),
    write: (records) =>
      open().then(
        (db) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite')
            const store = tx.objectStore(storeName)
            for (const record of records) store.put(record)
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => reject(tx.error)
          }),
      ),
  }
}

const indexedDbLnurlPaymentStore = createIndexedDbLnurlPaymentStore()

export function createLnurlPaymentRepository(store: LnurlPaymentStore = indexedDbLnurlPaymentStore): {
  upsert(records: StoredLnurlPayment[]): Promise<void>
  all(): Promise<StoredLnurlPayment[]>
  byPaymentReference(): Promise<Map<string, StoredLnurlPayment>>
} {
  return {
    upsert: async (records) => {
      const merged = new Map<string, StoredLnurlPayment>()
      for (const record of await store.read()) merged.set(record.key, record)
      for (const record of records) merged.set(record.key, record)
      await store.write([...merged.values()])
    },
    all: () => store.read(),
    byPaymentReference: async () => {
      const byReference = new Map<string, StoredLnurlPayment>()
      for (const record of await store.read()) {
        if (record.paymentReference) byReference.set(record.paymentReference, record)
      }
      return byReference
    },
  }
}

export const lnurlPaymentRepository: ReturnType<typeof createLnurlPaymentRepository> = createLnurlPaymentRepository()

const watermarkEntryKey = (baseUrl: string, lightningAddress: string): string => `${baseUrl}|${lightningAddress}`

const readWatermarkMap = (): Record<string, number> =>
  getStorageItem<Record<string, number>>(LNURL_WATERMARKS_STORAGE_KEY, {}, (value) => JSON.parse(value))

export const readLnurlWatermark = (baseUrl: string, lightningAddress: string): number | undefined =>
  readWatermarkMap()[watermarkEntryKey(baseUrl, lightningAddress)]

export const saveLnurlWatermark = (baseUrl: string, lightningAddress: string, since: number): void => {
  const stored = readWatermarkMap()
  stored[watermarkEntryKey(baseUrl, lightningAddress)] = since
  setStorageItemSafely(LNURL_WATERMARKS_STORAGE_KEY, JSON.stringify(stored), 'Failed to save lnurl watermark')
}
