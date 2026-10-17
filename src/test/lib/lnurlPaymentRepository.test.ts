import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { LNURL_WATERMARKS_STORAGE_KEY } from '../../lib/storageKeys'
import { syncPayments, type PaymentPage, type StoredPayment } from '@arkade-os/lnurl-client'
import { TxType, type ArkTransaction } from '@arkade-os/sdk'
import {
  clearLnurlPaymentsForReset,
  createIndexedDbLnurlPaymentStore,
  createLnurlActivityResolver,
  createLnurlPaymentRepository,
  createLnurlPaymentSyncStore,
  type LnurlPaymentStore,
} from '../../lib/lnurlPaymentRepository'

const SERVER_A = 'https://lnurl-a.test'
const SERVER_B = 'https://lnurl-b.test'
const ALICE = 'alice@example.com'
const BOB = 'bob@example.com'

const makePayment = (identifier: string, baseUrl = SERVER_A, extra: Partial<StoredPayment> = {}): StoredPayment => ({
  key: `${baseUrl}|${identifier}`,
  baseUrl,
  domain: 'example.com',
  lightningAddress: ALICE,
  handle: 'alice',
  identifier,
  kind: 'bolt11',
  settled: true,
  amountMsat: 21000,
  createdAt: 1700000000,
  settledAt: 1700000060,
  swapId: null,
  paymentReference: null,
  payoutReference: null,
  preimage: null,
  paymentOption: null,
  covenantScript: null,
  ...extra,
})

const makeTx = (arkTxid: string): ArkTransaction => ({
  key: { boardingTxid: '', commitmentTxid: '', arkTxid },
  type: TxType.TxReceived,
  amount: 42,
  settled: true,
  createdAt: 1700000060,
})

const createMemoryStore = (): LnurlPaymentStore => {
  let records: StoredPayment[] = []
  return {
    read: async () => [...records],
    write: async (next) => {
      const byKey = new Map(records.map((record) => [record.key, record]))
      for (const record of next) byKey.set(record.key, record)
      records = [...byKey.values()]
    },
    clear: async () => {
      records = []
    },
  }
}

/** A store whose `write` hangs until `release()`, to hold one write in flight. */
const heldWriteStore = (order: string[] = []): LnurlPaymentStore & { release: () => void } => {
  const store = createMemoryStore()
  let release!: () => void
  const held = new Promise<void>((resolve) => (release = resolve))
  const write = store.write
  return Object.assign(store, {
    write: async (records: StoredPayment[]) => {
      await held
      order.push('write')
      await write(records)
    },
    release: () => release(),
  })
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

type TxOutcome = 'complete' | 'abort' | 'error'

interface FakeRequest {
  result: unknown
  onsuccess: (() => void) | null
}

interface FakeTx {
  error: DOMException | null
  oncomplete: (() => void) | null
  onerror: (() => void) | null
  onabort: (() => void) | null
  abort: () => void
  objectStore: () => { put: (record: StoredPayment) => void; clear: () => void; getAll: () => FakeRequest }
}

const stubIndexedDb = ({
  records = [] as StoredPayment[],
  outcomes = [] as TxOutcome[],
  failTransaction = false,
  unreadable = false,
} = {}) => {
  let closes = 0
  let aborts = 0
  const db = {
    close: () => {
      closes += 1
    },
    transaction: (): FakeTx => {
      if (failTransaction) throw new DOMException('the connection is closing', 'InvalidStateError')
      const outcome = outcomes.shift() ?? 'complete'
      const requests: FakeRequest[] = []
      let aborted = false
      const tx: FakeTx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        abort: () => {
          aborts += 1
          aborted = true
          setTimeout(() => tx.onabort?.(), 0)
        },
        objectStore: () => ({
          put: (record) => {
            if (record.key === 'bad') throw new DOMException('invalid key', 'DataError')
          },
          clear: () => undefined,
          getAll: () => {
            const request: FakeRequest = { result: [...records], onsuccess: null }
            if (unreadable) {
              Object.defineProperty(request, 'result', {
                get: () => {
                  throw new DOMException('the request is not done', 'InvalidStateError')
                },
              })
            }
            requests.push(request)
            return request
          },
        }),
      }
      setTimeout(() => {
        if (aborted) return
        if (outcome === 'complete') {
          for (const request of requests) request.onsuccess?.()
          tx.oncomplete?.()
          return
        }
        // As in IDB: `error` bubbles while `tx.error` is still null; the abort steps set it, then fire `abort`.
        if (outcome === 'error') {
          tx.onerror?.()
          tx.error = new DOMException('quota exceeded', 'QuotaExceededError')
        }
        tx.onabort?.()
      }, 0)
      return tx
    },
  }
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request: { result: unknown; onsuccess: (() => void) | null } = { result: db, onsuccess: null }
      setTimeout(() => request.onsuccess?.(), 0)
      return request
    },
  })
  return { closes: () => closes, aborts: () => aborts }
}

const outcomeOf = (promise: Promise<unknown>): Promise<'resolved' | 'rejected' | 'pending'> =>
  Promise.race([
    promise.then(
      () => 'resolved' as const,
      () => 'rejected' as const,
    ),
    new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 100)),
  ])

describe('lnurlPaymentRepository', () => {
  it('upserting the same key twice leaves one record with the later values', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('hash-1', SERVER_A, { settled: false, settledAt: null })])
    await repository.upsert([makePayment('hash-1', SERVER_A, { settled: true, settledAt: 1700000060 })])
    const all = await repository.all()
    expect(all).toHaveLength(1)
    expect(all[0]?.settled).toBe(true)
    expect(all[0]?.settledAt).toBe(1700000060)
  })

  it('an overlapping upsert cannot revert a record it was not given', async () => {
    const store = createMemoryStore()
    await store.write([makePayment('hash-1', SERVER_A, { settled: false, settledAt: null })])
    const read = store.read
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    let reads = 0
    store.read = async () => {
      const snapshot = await read()
      if (reads++ === 0) await gate
      return snapshot
    }
    const repository = createLnurlPaymentRepository(store)

    const slow = repository.upsert([makePayment('hash-2')])
    await repository.upsert([makePayment('hash-1')]).finally(release)
    await slow

    const settled = (await read()).find((record) => record.identifier === 'hash-1')
    expect(settled?.settled).toBe(true)
  })

  it('keeps records that differ only by baseUrl', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('same-id', SERVER_A), makePayment('same-id', SERVER_B)])
    const all = await repository.all()
    expect(all).toHaveLength(2)
    expect(all.map((record) => record.key).sort()).toEqual([`${SERVER_A}|same-id`, `${SERVER_B}|same-id`])
  })

  it('forgets every record on clear, as a wallet reset needs', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('hash-1', SERVER_A, { preimage: 'ff'.repeat(32) }), makePayment('hash-2')])

    await repository.clear()

    expect(await repository.all()).toEqual([])
  })

  it('ignores an upsert once writes are closed', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())

    repository.closeWrites()
    await repository.upsert([makePayment('hash-1')])

    expect(await repository.all()).toEqual([])
  })

  it('settles only once a write that was already in flight lands', async () => {
    const store = heldWriteStore()
    const repository = createLnurlPaymentRepository(store)

    const pending = repository.upsert([makePayment('hash-1')])
    repository.closeWrites()
    let settled = false
    const writes = repository.writesSettled().then(() => (settled = true))
    await tick()
    expect(settled).toBe(false)

    store.release()
    await writes
    await pending

    expect(settled).toBe(true)
    expect(await repository.all()).toHaveLength(1)
  })

  it('settles even when the in-flight write rejects', async () => {
    const store = createMemoryStore()
    store.write = async () => {
      throw new Error('quota exceeded')
    }
    const repository = createLnurlPaymentRepository(store)

    await expect(repository.upsert([makePayment('hash-1')])).rejects.toThrow('quota exceeded')
    await expect(repository.writesSettled()).resolves.toBeUndefined()
  })
})

describe('clearLnurlPaymentsForReset', () => {
  it('waits out a write already in flight, then clears', async () => {
    const order: string[] = []
    const store = heldWriteStore(order)
    const clear = store.clear
    store.clear = async () => {
      order.push('clear')
      await clear()
    }
    const repository = createLnurlPaymentRepository(store)

    const pending = repository.upsert([makePayment('hash-1')])
    const reset = clearLnurlPaymentsForReset(repository)
    await tick()
    expect(order).toEqual([])

    store.release()
    await reset
    await pending

    expect(order).toEqual(['write', 'clear'])
    expect(await repository.all()).toEqual([])
  })

  it('rejects when the clear fails, leaving the records intact and the store open', async () => {
    const store = createMemoryStore()
    store.clear = async () => {
      throw new Error('indexeddb unavailable')
    }
    const repository = createLnurlPaymentRepository(store)
    await repository.upsert([makePayment('hash-1', SERVER_A, { preimage: 'ff'.repeat(32) })])

    await expect(clearLnurlPaymentsForReset(repository)).rejects.toThrow('indexeddb unavailable')

    expect(await repository.all()).toHaveLength(1)
    await repository.upsert([makePayment('hash-2')])
    expect(await repository.all()).toHaveLength(2)
  })

  // The claim-triggered `sync()` calls in `receive/lnurlRail.ts` are
  // fire-and-forget and tracked by no caller, so the gate has to refuse them.
  it('ignores a sync-store write that starts after it', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    const syncStore = createLnurlPaymentSyncStore(repository)

    await clearLnurlPaymentsForReset(repository)
    await syncStore.upsert([makePayment('late')])
    await syncStore.writeWatermark(SERVER_A, ALICE, 42)

    expect(await repository.all()).toEqual([])
    expect(localStorage.getItem(LNURL_WATERMARKS_STORAGE_KEY)).toBeNull()
  })
})

describe('createIndexedDbLnurlPaymentStore', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const operations: [string, (store: LnurlPaymentStore) => Promise<unknown>][] = [
    ['read', (store) => store.read()],
    ['write', (store) => store.write([makePayment('hash-1')])],
    ['clear', (store) => store.clear()],
  ]

  it.each(operations)('rejects a %s whose transaction only aborts, and closes the db', async (_operation, call) => {
    const idb = stubIndexedDb({ outcomes: ['abort'] })
    const pending = call(createIndexedDbLnurlPaymentStore())

    expect(await outcomeOf(pending)).toBe('rejected')
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(idb.closes()).toBe(1)
  })

  it('rejects with the transaction error when onerror is followed by onabort', async () => {
    const idb = stubIndexedDb({ outcomes: ['error'] })

    await expect(createIndexedDbLnurlPaymentStore().write([makePayment('hash-1')])).rejects.toMatchObject({
      name: 'QuotaExceededError',
    })

    expect(idb.closes()).toBe(1)
  })

  it.each(operations)('closes the db when %s throws synchronously', async (_operation, call) => {
    const idb = stubIndexedDb({ failTransaction: true })

    await expect(call(createIndexedDbLnurlPaymentStore())).rejects.toMatchObject({ name: 'InvalidStateError' })

    expect(idb.closes()).toBe(1)
  })

  it('aborts a write whose put throws, so none of the batch commits', async () => {
    const idb = stubIndexedDb()
    const write = createIndexedDbLnurlPaymentStore().write([
      makePayment('hash-1'),
      { ...makePayment('hash-2'), key: 'bad' },
    ])

    await expect(write).rejects.toMatchObject({ name: 'DataError' })

    expect(idb.aborts()).toBe(1)
    expect(idb.closes()).toBe(1)
  })

  it('rejects a read whose result cannot be read, rather than hanging', async () => {
    const idb = stubIndexedDb({ unreadable: true })
    const read = createIndexedDbLnurlPaymentStore().read()

    expect(await outcomeOf(read)).toBe('rejected')
    await expect(read).rejects.toMatchObject({ name: 'InvalidStateError' })
    expect(idb.closes()).toBe(1)
  })

  it('resolves a committed write and closes the db', async () => {
    const idb = stubIndexedDb()

    await expect(createIndexedDbLnurlPaymentStore().write([makePayment('hash-1')])).resolves.toBeUndefined()

    expect(idb.closes()).toBe(1)
  })

  it('reads back the stored records and closes the db', async () => {
    const records = [makePayment('hash-1'), makePayment('hash-2')]
    const idb = stubIndexedDb({ records })

    await expect(createIndexedDbLnurlPaymentStore().read()).resolves.toEqual(records)

    expect(idb.closes()).toBe(1)
  })

  it('settles a reset while an aborting write is in flight', async () => {
    const idb = stubIndexedDb({ outcomes: ['abort'] })
    const repository = createLnurlPaymentRepository(createIndexedDbLnurlPaymentStore())
    const pending = repository.upsert([makePayment('hash-1')]).catch((err: unknown) => err)

    const reset = clearLnurlPaymentsForReset(repository)

    expect(await outcomeOf(reset)).toBe('resolved')
    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    expect(idb.closes()).toBe(2)
  })
})

describe('createLnurlActivityResolver', () => {
  it('attributes a transaction whose txid matches a payout reference', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('verify-1', SERVER_A, { kind: 'destination', payoutReference: 'txid-1' })])
    const resolver = createLnurlActivityResolver(repository)
    await resolver.prepare?.()

    const memberships = resolver.resolve(makeTx('txid-1'))

    expect(memberships).toHaveLength(1)
    expect(memberships?.[0]?.metadata).toMatchObject({ lightningAddress: ALICE })
  })

  it('leaves an unrelated transaction plain', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('verify-1', SERVER_A, { kind: 'destination', payoutReference: 'txid-1' })])
    const resolver = createLnurlActivityResolver(repository)
    await resolver.prepare?.()

    expect(resolver.resolve(makeTx('txid-other'))).toBeUndefined()
  })

  it('picks up records written after the first history load', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    const resolver = createLnurlActivityResolver(repository)
    await resolver.prepare?.()
    expect(resolver.resolve(makeTx('txid-late'))).toBeUndefined()

    await repository.upsert([
      makePayment('verify-late', SERVER_A, { kind: 'destination', payoutReference: 'txid-late' }),
    ])
    await resolver.prepare?.()

    expect(resolver.resolve(makeTx('txid-late'))).toHaveLength(1)
  })

  // Review Focus 4: rows written by #1000's adapter, before `handle` existed, must still be labelled.
  it('labels a stored row without a handle', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([
      makePayment('verify-1', SERVER_A, { kind: 'destination', payoutReference: 'txid-1', handle: '' }),
    ])
    const resolver = createLnurlActivityResolver(repository)
    await resolver.prepare?.()

    expect(resolver.resolve(makeTx('txid-1'))?.[0]?.label).toContain(ALICE)
  })
})

describe('lnurl payment sync store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('drives the package sync loop into the wallet stores', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    const page: PaymentPage = {
      source: { domain: 'example.com', lightningAddress: ALICE, handle: 'alice' },
      payments: [
        {
          kind: 'destination',
          verifyId: 'verify-1',
          paymentOption: 'arkade',
          paymentDestination: 'ark1qptest',
          covenantScript: null,
          paymentReference: 'txid-1',
          payoutReference: null,
          settled: true,
          amountMsat: 42000,
          createdAt: 1700000000,
          settledAt: 1700000060,
        },
      ],
      nextSince: 1700000000,
    }

    const store = createLnurlPaymentSyncStore(repository)
    const result = await syncPayments([{ baseUrl: SERVER_A, token: 'tok', handle: 'alice', domain: 'example.com' }], {
      client: () => ({ listPayments: async () => page }),
      store,
    })

    expect(result).toEqual({ synced: 1, failures: [] })
    expect(await store.readWatermark(SERVER_A, ALICE)).toBe(1700000000)
    expect(await repository.all()).toEqual([
      expect.objectContaining({ identifier: 'verify-1', paymentReference: 'txid-1' }),
    ])
  })
})

describe('lnurl watermarks', () => {
  const store = createLnurlPaymentSyncStore(createLnurlPaymentRepository(createMemoryStore()))

  beforeEach(() => {
    localStorage.clear()
  })

  it('returns undefined when unset', async () => {
    expect(await store.readWatermark(SERVER_A, ALICE)).toBeUndefined()
  })

  it('round-trips per baseUrl and lightning address', async () => {
    await store.writeWatermark(SERVER_A, ALICE, 42)
    expect(await store.readWatermark(SERVER_A, ALICE)).toBe(42)
    expect(await store.readWatermark(SERVER_B, ALICE)).toBeUndefined()
    expect(await store.readWatermark(SERVER_A, BOB)).toBeUndefined()
    await store.writeWatermark(SERVER_B, ALICE, 7)
    await store.writeWatermark(SERVER_A, BOB, 9)
    expect(await store.readWatermark(SERVER_A, ALICE)).toBe(42)
    expect(await store.readWatermark(SERVER_B, ALICE)).toBe(7)
    expect(await store.readWatermark(SERVER_A, BOB)).toBe(9)
  })

  it.each(['null', '[]', '7'])('treats a stored %s as no watermarks, and still writes', async (raw) => {
    localStorage.setItem(LNURL_WATERMARKS_STORAGE_KEY, raw)
    expect(await store.readWatermark(SERVER_A, ALICE)).toBeUndefined()
    await store.writeWatermark(SERVER_A, ALICE, 5)
    expect(await store.readWatermark(SERVER_A, ALICE)).toBe(5)
  })
})
