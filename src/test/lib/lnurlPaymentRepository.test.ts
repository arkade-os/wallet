import { describe, it, expect, beforeEach } from 'vitest'
import { syncPayments, type PaymentPage, type StoredPayment } from '@arkade-os/lnurl-client'
import { TxType, type ArkTransaction } from '@arkade-os/sdk'
import {
  createLnurlActivityResolver,
  createLnurlPaymentRepository,
  createLnurlPaymentSyncStore,
  normalizeStoredPayment,
  readLnurlWatermark,
  saveLnurlWatermark,
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
      records = [...next]
    },
  }
}

describe('normalizeStoredPayment', () => {
  it('defaults handle on a row written before the field existed', () => {
    const legacy: Partial<StoredPayment> = makePayment('hash-1')
    delete legacy.handle
    expect(normalizeStoredPayment(legacy as Omit<StoredPayment, 'handle'>).handle).toBe('')
  })

  it('leaves an existing handle untouched', () => {
    expect(normalizeStoredPayment(makePayment('hash-1', SERVER_A, { handle: 'bob' })).handle).toBe('bob')
  })
})

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

  it('keeps records that differ only by baseUrl', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('same-id', SERVER_A), makePayment('same-id', SERVER_B)])
    const all = await repository.all()
    expect(all).toHaveLength(2)
    expect(all.map((record) => record.key).sort()).toEqual([`${SERVER_A}|same-id`, `${SERVER_B}|same-id`])
  })

  it('indexes records by payment reference', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([
      makePayment('verify-1', SERVER_A, { kind: 'destination', paymentReference: 'txid-1' }),
      makePayment('hash-2', SERVER_A),
    ])
    const byReference = await repository.byPaymentReference()
    expect(byReference.size).toBe(1)
    expect(byReference.get('txid-1')?.identifier).toBe('verify-1')
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

    const result = await syncPayments([{ baseUrl: SERVER_A, token: 'tok', handle: 'alice', domain: 'example.com' }], {
      client: () => ({ listPayments: async () => page }),
      store: createLnurlPaymentSyncStore(repository),
    })

    expect(result).toEqual({ synced: 1, failures: [] })
    expect(readLnurlWatermark(SERVER_A, ALICE)).toBe(1700000000)
    const byReference = await repository.byPaymentReference()
    expect(byReference.get('txid-1')?.identifier).toBe('verify-1')
  })
})

describe('lnurl watermarks', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns undefined when unset', () => {
    expect(readLnurlWatermark(SERVER_A, ALICE)).toBeUndefined()
  })

  it('round-trips per baseUrl and lightning address', () => {
    saveLnurlWatermark(SERVER_A, ALICE, 42)
    expect(readLnurlWatermark(SERVER_A, ALICE)).toBe(42)
    expect(readLnurlWatermark(SERVER_B, ALICE)).toBeUndefined()
    expect(readLnurlWatermark(SERVER_A, BOB)).toBeUndefined()
    saveLnurlWatermark(SERVER_B, ALICE, 7)
    saveLnurlWatermark(SERVER_A, BOB, 9)
    expect(readLnurlWatermark(SERVER_A, ALICE)).toBe(42)
    expect(readLnurlWatermark(SERVER_B, ALICE)).toBe(7)
    expect(readLnurlWatermark(SERVER_A, BOB)).toBe(9)
  })
})
