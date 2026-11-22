const STORE = 'attempts'

export interface PaymentFundingAttempt {
  quoteId: string
  swapId: string
}

export class PaymentSubmissionPending extends Error {
  readonly reason: string

  constructor(swapId: string) {
    super('This payment may already be submitted. Check its status before paying again.')
    this.name = 'PaymentSubmissionPending'
    this.reason = swapId
  }
}

export class PaymentNotSubmitted extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : 'The payment was not submitted', { cause })
    this.name = 'PaymentNotSubmitted'
  }
}

let connection: Promise<IDBDatabase> | undefined

function openDb(): Promise<IDBDatabase> {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('arkade-payment-funding', 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          connection = undefined
        }
        resolve(db)
      }
      request.onerror = () => reject(request.error)
    }).catch((error) => {
      connection = undefined
      throw error
    })
  }
  return connection
}

// The read and write share one transaction even when tabs cannot use Web Locks.
async function updateAttempt<T>(
  key: string,
  update: (store: IDBObjectStore, previous: PaymentFundingAttempt | undefined) => T,
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const read = store.get(key)
    let result: T
    read.onsuccess = () => {
      result = update(store, read.result as PaymentFundingAttempt | undefined)
    }
    tx.oncomplete = () => resolve(result)
    tx.onabort = () => reject(tx.error ?? new Error('Payment safety storage was interrupted'))
  })
}

export function claimPaymentFunding(
  key: string,
  next: PaymentFundingAttempt,
  replaceQuoteId?: string,
): Promise<PaymentFundingAttempt | undefined> {
  return updateAttempt(key, (store, previous) => {
    if (previous && previous.quoteId !== replaceQuoteId) return previous
    store.put(next, key)
    return undefined
  })
}

export function readPaymentFunding(key: string): Promise<PaymentFundingAttempt | undefined> {
  return updateAttempt(key, (_store, previous) => previous)
}

export function releasePaymentFunding(key: string, quoteId: string): Promise<void> {
  return updateAttempt(key, (store, previous) => {
    if (previous?.quoteId === quoteId) store.delete(key)
  })
}
