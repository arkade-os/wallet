import type { PaymentSyncStore, StoredPayment } from '@arkade-os/lnurl-client'
import { lnurlActivityResolver } from '@arkade-os/lnurl-client/arkade'
import type { ActivityResolver } from '@arkade-os/sdk'
import { getStorageItem, setStorageItemSafely } from './storage'
import { LNURL_WATERMARKS_STORAGE_KEY } from './storageKeys'

/** The persistence primitive, injectable so tests need no IndexedDB. */
export interface LnurlPaymentStore {
  read(): Promise<StoredPayment[]>
  /** Puts by `key`, leaving records it isn't given untouched. */
  write(records: StoredPayment[]): Promise<void>
  clear(): Promise<void>
}

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
  /** Settles on `abort`, never `error`: a failure at commit (a quota overrun, say)
   *  fires only `abort`, and a request's `error` bubbles here before `tx.error` is
   *  set, then the abort that follows carries it. */
  const run = <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => () => T): Promise<T> =>
    open().then(
      (db) =>
        new Promise<T>((resolve, reject) => {
          const fail = (error: unknown) => {
            db.close()
            reject(error ?? new DOMException('Transaction aborted', 'AbortError'))
          }
          let started: IDBTransaction | undefined
          try {
            const tx = db.transaction(storeName, mode)
            started = tx
            const result = work(tx.objectStore(storeName))
            tx.oncomplete = () => {
              db.close()
              try {
                resolve(result())
              } catch (err) {
                reject(err)
              }
            }
            tx.onabort = () => fail(tx.error)
          } catch (err) {
            // close() lets a live transaction commit what `work` queued before it threw.
            if (started) {
              started.onabort = () => fail(err)
              started.abort()
            } else fail(err)
          }
        }),
    )
  return {
    read: () =>
      run('readonly', (store) => {
        const request = store.getAll()
        return () => request.result as StoredPayment[]
      }),
    write: (records) =>
      run('readwrite', (store) => {
        for (const record of records) store.put(record)
        return () => undefined
      }),
    clear: () =>
      run('readwrite', (store) => {
        store.clear()
        return () => undefined
      }),
  }
}

const indexedDbLnurlPaymentStore = createIndexedDbLnurlPaymentStore()

export function createLnurlPaymentRepository(store: LnurlPaymentStore = indexedDbLnurlPaymentStore): {
  upsert(records: StoredPayment[]): Promise<void>
  all(): Promise<StoredPayment[]>
  clear(): Promise<void>
  closeWrites(): void
  reopenWrites(): void
  writesClosed(): boolean
  writesSettled(): Promise<void>
} {
  const inFlight = new Set<Promise<void>>()
  let closed = false
  return {
    // Refusing and registering happen in one synchronous turn, so no write can
    // slip past `closeWrites` and then land after `writesSettled` resolved.
    upsert: async (records) => {
      if (closed) return
      const write = store.write(records)
      inFlight.add(write)
      try {
        await write
      } finally {
        inFlight.delete(write)
      }
    },
    all: () => store.read(),
    clear: () => store.clear(),
    closeWrites: () => {
      closed = true
    },
    reopenWrites: () => {
      closed = false
    },
    writesClosed: () => closed,
    writesSettled: async () => {
      await Promise.allSettled([...inFlight])
    },
  }
}

export const lnurlPaymentRepository: ReturnType<typeof createLnurlPaymentRepository> = createLnurlPaymentRepository()

/** A reset's LNURL step: shut the store to new writes, let the ones already in
 *  flight land, then clear. Rejects if the clear fails so the caller can abort
 *  with the wallet intact — finishing a reset that still holds the previous
 *  wallet's preimages is the worse outcome. A failed clear reopens the gate: the
 *  reset is abandoned with the wallet intact, so the store keeps working. */
export const clearLnurlPaymentsForReset = async (
  repository: ReturnType<typeof createLnurlPaymentRepository> = lnurlPaymentRepository,
): Promise<void> => {
  repository.closeWrites()
  await repository.writesSettled()
  try {
    await repository.clear()
  } catch (err) {
    repository.reopenWrites()
    throw err
  }
}

/** Wraps the package's resolver with a re-read on every `prepare()`: the sync
 *  loop writes after the first history load, and a snapshot cached at
 *  construction would leave those receives unattributed until a reconnect. */
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

const watermarkEntryKey = (baseUrl: string, lightningAddress: string): string => `${baseUrl}|${lightningAddress}`

const readWatermarkMap = (): Record<string, number> =>
  getStorageItem<Record<string, number>>(LNURL_WATERMARKS_STORAGE_KEY, {}, (value) => {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, number>) : {}
  })

/** What `syncPayments` from `@arkade-os/lnurl-client` writes through. The package
 * ships no storage because IndexedDB exists in neither Node nor React Native. */
export const createLnurlPaymentSyncStore = (
  repository: ReturnType<typeof createLnurlPaymentRepository> = lnurlPaymentRepository,
): PaymentSyncStore => ({
  upsert: (records) => repository.upsert(records),
  readWatermark: async (baseUrl, lightningAddress) => readWatermarkMap()[watermarkEntryKey(baseUrl, lightningAddress)],
  writeWatermark: async (baseUrl, lightningAddress, since) => {
    if (repository.writesClosed()) return
    const stored = readWatermarkMap()
    stored[watermarkEntryKey(baseUrl, lightningAddress)] = since
    setStorageItemSafely(LNURL_WATERMARKS_STORAGE_KEY, JSON.stringify(stored), 'Failed to save lnurl watermark')
  },
})

export const lnurlPaymentSyncStore: PaymentSyncStore = createLnurlPaymentSyncStore()
