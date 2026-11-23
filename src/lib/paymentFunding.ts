import { hex } from '@scure/base'
import type { CorridorSwapRecord, LockupSpendIndexer } from '@arkade-os/swap'
import { readLockupFate } from '@arkade-os/swap/protocol'
import type { SwapRoutePlan } from './swapRoutePlan'

const STORE = 'attempts'
const lockName = (key: string) => `arkade-payment-funding:${key}`

export interface PaymentFundingAttempt {
  quoteId: string
  swapId: string
  guarded?: true
  recordSaved?: true
  chain?: { lightningQuoteId: string; sats: bigint }
  route?: SwapRoutePlan
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

export class PaymentRequiresNewInvoice extends Error {
  readonly reason: string

  constructor(swapId: string) {
    super('The previous swap was refunded. Ask for a new Lightning invoice to try again.')
    this.name = 'PaymentRequiresNewInvoice'
    this.reason = swapId
  }
}

let connection: Promise<IDBDatabase> | undefined
const checkpoints = new Map<string, () => Promise<void>>()

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
    const tx = db.transaction(STORE, 'readwrite', { durability: 'strict' })
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

/** Hold this until SDK acceptance finishes, even if the swap driver hands off mid-call. */
export async function withPaymentFundingLock<T>(key: string, run: (guarded: boolean) => Promise<T>): Promise<T> {
  if (!navigator.locks) return run(false)
  return await navigator.locks.request(lockName(key), { ifAvailable: true }, async (lock) => {
    if (lock) return run(true)
    const attempt = await readPaymentFunding(key)
    if (attempt) throw new PaymentSubmissionPending(attempt.swapId)
    throw new PaymentNotSubmitted(new Error('Another tab is preparing this payment'))
  })
}

export async function withPaymentFundingStatus<T>(key: string, read: (guarded: boolean) => Promise<T>): Promise<T> {
  if (!navigator.locks) return read(false)
  return navigator.locks.request(lockName(key), { ifAvailable: true }, (lock) => read(Boolean(lock)))
}

export function canReplaceMissingPaymentRecord(attempt: PaymentFundingAttempt, guarded: boolean): boolean {
  return guarded && attempt.guarded === true && attempt.recordSaved !== true
}

export async function hasConfirmedPaymentRefund(
  record: Pick<
    CorridorSwapRecord,
    'kind' | 'state' | 'fundingTxid' | 'settlementPreimageHex' | 'lockupPkScript' | 'lock'
  >,
  indexer: LockupSpendIndexer,
): Promise<boolean> {
  if (
    record.kind !== 'lightning_send' ||
    record.state !== 'refunded' ||
    !record.fundingTxid ||
    record.settlementPreimageHex
  ) {
    return false
  }
  // The SDK can record "refunded" from a timeout or a local push. Prove the actual deposit
  // was observed and every output at the lockup spent through a refund leaf.
  try {
    let fundingSeen = false
    const fate = await readLockupFate(
      {
        getVtxos: async (options) => {
          const page = await indexer.getVtxos(options)
          fundingSeen ||= page.vtxos.some(({ txid }) => txid === record.fundingTxid)
          return page
        },
        getVirtualTxs: (transactions) => indexer.getVirtualTxs(transactions),
      },
      { swapPkScript: hex.decode(record.lockupPkScript), paymentHash: record.lock.hash },
    )
    return fundingSeen && fate.fate === 'returned'
  } catch {
    return false
  }
}

export async function withPaymentFundingCheckpoint<T>(key: string, quoteId: string, run: () => Promise<T>): Promise<T> {
  if (checkpoints.has(quoteId)) throw new Error('The payment quote is already being accepted')
  checkpoints.set(quoteId, async () => {
    const saved = await updateAttempt(key, (store, previous) => {
      if (previous?.quoteId !== quoteId) return false
      if (!previous.recordSaved) store.put({ ...previous, recordSaved: true }, key)
      return true
    })
    if (!saved) throw new Error('The payment funding reservation was lost')
  })
  try {
    return await run()
  } finally {
    checkpoints.delete(quoteId)
  }
}

export async function checkpointPaymentRecord(quoteId: string): Promise<void> {
  await checkpoints.get(quoteId)?.()
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
