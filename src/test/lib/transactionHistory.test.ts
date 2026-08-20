import { describe, it, expect } from 'vitest'
import type { ArkTransaction } from '@arkade-os/sdk'
import { arkTransactionToTx, sortLocalTxs, txidOfArkTransaction } from '../../lib/transactionHistory'
import type { Tx } from '../../lib/types'

const arkTx = (
  over: Omit<Partial<ArkTransaction>, 'key'> & { key?: Partial<ArkTransaction['key']> } = {},
): ArkTransaction =>
  ({
    amount: 1000,
    createdAt: 1_700_000_000_000,
    settled: true,
    type: 'RECEIVED',
    ...over,
    key: { arkTxid: 'ark-txid', boardingTxid: '', commitmentTxid: '', ...over.key },
  }) as ArkTransaction

describe('txidOfArkTransaction', () => {
  it('prefers the ark txid, then the commitment txid, then the boarding txid', () => {
    expect(txidOfArkTransaction(arkTx({ key: { commitmentTxid: 'commitment' } }))).toBe('ark-txid')
    expect(txidOfArkTransaction(arkTx({ key: { arkTxid: '', commitmentTxid: 'commitment' } }))).toBe('commitment')
    expect(txidOfArkTransaction(arkTx({ key: { arkTxid: '', boardingTxid: 'boarding' } }))).toBe('boarding')
  })
})

describe('arkTransactionToTx', () => {
  it('converts the millisecond timestamp to unix seconds', () => {
    expect(arkTransactionToTx(arkTx({ createdAt: 1_700_000_000_500 })).createdAt).toBe(1_700_000_000)
  })

  it('keeps the amount absolute and the type lowercased', () => {
    expect(arkTransactionToTx(arkTx({ amount: -420, type: 'SENT' as ArkTransaction['type'] }))).toMatchObject({
      amount: 420,
      type: 'sent',
    })
  })

  it('shows every sent tx as settled but leaves received rows alone', () => {
    expect(arkTransactionToTx(arkTx({ settled: false, type: 'SENT' as ArkTransaction['type'] }))).toMatchObject({
      settled: true,
      preconfirmed: true,
    })
    expect(arkTransactionToTx(arkTx({ settled: false })).settled).toBe(false)
  })

  it('grafts the metadata it is handed, gating the sent-only fields on direction', () => {
    const metadata = { assetAction: 'burned' as const, destination: 'tark1dest', networkFee: 7, savedAt: 0 }
    expect(arkTransactionToTx(arkTx({ type: 'SENT' as ArkTransaction['type'] }), metadata)).toMatchObject({
      assetAction: 'burned',
      destination: 'tark1dest',
      networkFee: 7,
    })
    expect(arkTransactionToTx(arkTx(), metadata).destination).toBeUndefined()
  })
})

describe('sortLocalTxs', () => {
  const tx = (createdAt: number, type = 'received'): Tx => ({ createdAt, type }) as Tx

  it('floats undated rows to the top, sorts the rest newest first, and ties sent before received', () => {
    const sorted = sortLocalTxs([tx(10), tx(0), tx(30), tx(30, 'sent')])
    expect(sorted.map((t) => [t.createdAt, t.type])).toEqual([
      [0, 'received'],
      [30, 'sent'],
      [30, 'received'],
      [10, 'received'],
    ])
  })

  it('does not mutate its input', () => {
    const input = [tx(10), tx(30)]
    sortLocalTxs(input)
    expect(input.map((t) => t.createdAt)).toEqual([10, 30])
  })
})
