import type { LockupSpendIndexer } from '@arkade-os/swap'
import { readLockupFate } from '@arkade-os/swap/protocol'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canReplaceMissingPaymentRecord,
  hasConfirmedPaymentRefund,
  withPaymentFundingLock,
} from '../../lib/paymentFunding'

vi.mock('@arkade-os/swap/protocol', () => ({ readLockupFate: vi.fn() }))

const attempt = { quoteId: 'quote', swapId: 'swap' }

describe('payment funding ownership', () => {
  it('requires exclusive ownership and a guarded reservation for recovery after an absent SDK record', () => {
    expect(canReplaceMissingPaymentRecord({ ...attempt, guarded: true }, true)).toBe(true)
    expect(canReplaceMissingPaymentRecord({ ...attempt, guarded: true }, false)).toBe(false)
    expect(canReplaceMissingPaymentRecord(attempt, true)).toBe(false)
    expect(canReplaceMissingPaymentRecord({ ...attempt, guarded: true, recordSaved: true }, true)).toBe(false)
  })

  it('keeps the per-payment lock until asynchronous acceptance finishes', async () => {
    let finish!: () => void
    let held = false
    const accept = new Promise<void>((resolve) => (finish = resolve))
    const request = vi.fn(async (_name: string, _options: LockOptions, callback: LockGrantedCallback<unknown>) => {
      held = true
      try {
        return await callback({ name: 'funding', mode: 'exclusive' })
      } finally {
        held = false
      }
    })
    vi.stubGlobal('navigator', { locks: { request } })
    try {
      const result = withPaymentFundingLock('invoice', async (guarded) => {
        expect(guarded).toBe(true)
        await accept
        expect(held).toBe(true)
      })
      expect(held).toBe(true)
      expect(request).toHaveBeenCalledWith(
        'arkade-payment-funding:invoice',
        { ifAvailable: true },
        expect.any(Function),
      )
      finish()
      await result
      expect(held).toBe(false)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('payment refund proof', () => {
  const record = {
    kind: 'lightning_send',
    state: 'refunded',
    fundingTxid: 'a'.repeat(64),
    lockupPkScript: '51',
    lock: { hash: '0'.repeat(64) },
  } as const
  const indexer = {
    getVtxos: vi.fn<LockupSpendIndexer['getVtxos']>(),
    getVirtualTxs: vi.fn<LockupSpendIndexer['getVirtualTxs']>(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  function observedSpend(txid: string, fate: Awaited<ReturnType<typeof readLockupFate>>) {
    const vtxos = [{ txid }] as Awaited<ReturnType<LockupSpendIndexer['getVtxos']>>['vtxos']
    indexer.getVtxos.mockResolvedValue({ vtxos })
    vi.mocked(readLockupFate).mockImplementation(async (reader, { paymentHash }) => {
      expect(paymentHash).toBe(record.lock.hash)
      await reader.getVtxos({ scripts: [record.lockupPkScript] })
      return fate
    })
  }

  it('accepts only a returned lockup containing the original funding output', async () => {
    observedSpend(record.fundingTxid, { fate: 'returned', spends: [], leafScripts: [] })
    expect(await hasConfirmedPaymentRefund(record, indexer)).toBe(true)
    observedSpend('b'.repeat(64), { fate: 'returned', spends: [], leafScripts: [] })
    expect(await hasConfirmedPaymentRefund(record, indexer)).toBe(false)
  })

  it('keeps a heuristic refund, a pending send, and a paid invoice fenced', async () => {
    observedSpend(record.fundingTxid, { fate: 'unknown' })
    expect(await hasConfirmedPaymentRefund(record, indexer)).toBe(false)
    expect(await hasConfirmedPaymentRefund({ ...record, state: 'pending' }, indexer)).toBe(false)
    expect(await hasConfirmedPaymentRefund({ ...record, settlementPreimageHex: 'f'.repeat(64) }, indexer)).toBe(false)
    expect(readLockupFate).toHaveBeenCalledTimes(1)
  })

  it('fails closed if the refund lookup fails and never checks for a refund after learning the preimage', async () => {
    observedSpend(record.fundingTxid, { fate: 'returned', spends: [], leafScripts: [] })
    indexer.getVtxos.mockRejectedValueOnce(new Error('Indexer unavailable'))
    expect(await hasConfirmedPaymentRefund(record, indexer)).toBe(false)
    expect(await hasConfirmedPaymentRefund({ ...record, settlementPreimageHex: 'f'.repeat(64) }, indexer)).toBe(false)
    expect(readLockupFate).toHaveBeenCalledTimes(1)
  })
})
