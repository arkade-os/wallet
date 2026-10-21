import { describe, it, expect, beforeEach } from 'vitest'
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

describe('lnurl watermarks', () => {
  beforeEach(() => localStorage.clear())

  it('keeps cursors under the key existing wallets already use, and reset purges it', async () => {
    localStorage.setItem(LNURL_WATERMARKS_STORAGE_KEY, JSON.stringify({ [`${SERVER_A}|${ALICE}`]: 42 }))
    const repository = createLnurlPaymentRepository(createMemoryStore())

    expect(await repository.readWatermark(SERVER_A, ALICE)).toBe(42)
    await repository.writeWatermark(SERVER_B, BOB, 7)
    expect(JSON.parse(localStorage.getItem(LNURL_WATERMARKS_STORAGE_KEY)!)).toEqual({
      [`${SERVER_A}|${ALICE}`]: 42,
      [`${SERVER_B}|${BOB}`]: 7,
    })

    await clearLnurlPaymentsForReset(repository)
    expect(localStorage.getItem(LNURL_WATERMARKS_STORAGE_KEY)).toBeNull()
  })
})

describe('createLnurlActivityResolver', () => {
  it('picks up records written after the first history load', async () => {
    const repository = createLnurlPaymentRepository(createMemoryStore())
    const resolver = createLnurlActivityResolver(repository)
    await resolver.prepare?.()
    expect(resolver.resolve(makeTx('txid-late'))).toBeUndefined()

    await repository.upsert([
      makePayment('verify-late', SERVER_A, { kind: 'destination', payoutReference: 'txid-late' }),
    ])
    await resolver.prepare?.()

    expect(resolver.resolve(makeTx('txid-late'))).toEqual([
      expect.objectContaining({ metadata: expect.objectContaining({ lightningAddress: ALICE }) }),
    ])
  })
})
