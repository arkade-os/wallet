import { describe, it, expect, beforeEach } from 'vitest'
import { syncPayments, type PaymentPage, type StoredPayment } from '@arkade-os/lnurl-client'
import {
  createLnurlPaymentRepository,
  createLnurlPaymentSyncStore,
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
  identifier,
  kind: 'bolt11',
  settled: true,
  amountMsat: 21000,
  createdAt: 1700000000,
  settledAt: 1700000060,
  swapId: null,
  paymentReference: null,
  ...extra,
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

describe('lnurl payment sync store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('drives the package sync loop into the wallet stores', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    const page: PaymentPage = {
      source: { domain: 'example.com', lightningAddress: ALICE },
      payments: [
        {
          kind: 'destination',
          verifyId: 'verify-1',
          paymentOption: 'arkade',
          paymentDestination: 'ark1qptest',
          covenantScript: null,
          paymentReference: 'txid-1',
          settled: true,
          amountMsat: 42000,
          createdAt: 1700000000,
          settledAt: 1700000060,
        },
      ],
      nextSince: 1700000000,
    }

    const result = await syncPayments([{ baseUrl: SERVER_A, token: 'tok', username: 'alice', domain: 'example.com' }], {
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
