import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LNURL_WATERMARKS_STORAGE_KEY } from '../../lib/storageKeys'
import type { LnurlPaymentStore, StoredPayment } from '@arkade-os/lnurl-client'
import { TxType, type ArkTransaction } from '@arkade-os/sdk'
import {
  clearLnurlPaymentsForReset,
  createLnurlActivityResolver,
  createLnurlPaymentRepository,
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

describe('clearLnurlPaymentsForReset', () => {
  beforeEach(() => localStorage.clear())

  it('purges persisted watermarks with the payment records', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    await repository.upsert([makePayment('hash-1')])
    await repository.writeWatermark(SERVER_A, ALICE, 42)

    await clearLnurlPaymentsForReset(repository)

    expect(await repository.all()).toEqual([])
    expect(localStorage.getItem(LNURL_WATERMARKS_STORAGE_KEY)).toBeNull()
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
})

describe('lnurl watermarks', () => {
  const store = createLnurlPaymentRepository(createMemoryStore())

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

  it('surfaces watermark persistence failures to the sync caller', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded')
    })

    await expect(store.writeWatermark(SERVER_A, ALICE, 42)).rejects.toThrow('quota exceeded')

    expect(await store.readWatermark(SERVER_A, ALICE)).toBeUndefined()
  })

  it.each(['null', '[]', '7'])('treats a stored %s as no watermarks, and still writes', async (raw) => {
    localStorage.setItem(LNURL_WATERMARKS_STORAGE_KEY, raw)
    expect(await store.readWatermark(SERVER_A, ALICE)).toBeUndefined()
    await store.writeWatermark(SERVER_A, ALICE, 5)
    expect(await store.readWatermark(SERVER_A, ALICE)).toBe(5)
  })
})
