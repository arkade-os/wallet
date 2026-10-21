import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle, type ArkTransaction, type RouteQuote } from '@arkade-os/sdk'
import { LNURL_ARKADE_RAIL } from '@arkade-os/lnurl-client/arkade'
import {
  createSentActivityResolver,
  forgetLnurlSends,
  lnurlSends,
  markLnurlReceiverConfirmed,
  recordLnurlSend,
  resumeLnurlConfirmations,
  subscribeLnurlSends,
} from '../../lib/lnurlSends'
import { LNURL_SENDS_STORAGE_KEY } from '../../lib/storageKeys'

const addConfirmation = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/lnurlConfirmations', () => ({ pendingConfirmations: { add: addConfirmation, forget: vi.fn() } }))
vi.mock('../../lib/logs', () => ({ consoleError: reportError }))

beforeEach(() => {
  forgetLnurlSends()
  localStorage.clear()
  addConfirmation.mockClear()
  reportError.mockClear()
})

const TARGET = 'alice@pay.example'

const quote = (railId: string): RouteQuote => ({
  railId,
  amount: 2_100,
  fee: 0,
  total: 2_100,
  meta: { lnurl: { target: TARGET, via: 'ark' } },
  send: async () => {
    throw new Error('not sent here')
  },
})

const sentTx = (arkTxid: string) =>
  ({ key: { arkTxid, boardingTxid: '', commitmentTxid: '' }, type: 'SENT', amount: 2_100 }) as ArkTransaction

const settledHandle = (txid: string) =>
  makeHandle(LNURL_ARKADE_RAIL, async (emit) => {
    const result = { railId: 'ark', txid }
    emit({ status: 'settled', result })
    return result
  })

describe('reading persisted LNURL sends', () => {
  it('preserves valid pending send records and their verification data', () => {
    const rows = [
      {
        txid: 'pending',
        target: TARGET,
        railId: LNURL_ARKADE_RAIL,
        amountSat: 2_100,
        feeSat: 0,
        createdAt: 123,
        preimage: 'ab'.repeat(32),
        verify: 'https://a/v',
        expect: { paymentOption: 'arkade', paymentDestination: 'ark1recipient' },
      },
    ]
    const stored = JSON.stringify(rows)
    localStorage.setItem(LNURL_SENDS_STORAGE_KEY, stored)

    expect(lnurlSends()).toEqual(rows)
    resumeLnurlConfirmations()
    expect(addConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'pending', startedAt: 123, expect: rows[0].expect }),
    )
    expect(localStorage.getItem(LNURL_SENDS_STORAGE_KEY)).toBe(stored)
  })
})

describe('recording an LNURL send', () => {
  it('writes what was paid, to whom and by which rail, once the rail names a txid', async () => {
    const handle = settledHandle('ark-txid')
    recordLnurlSend(handle, quote(LNURL_ARKADE_RAIL), 'typed-target')
    await handle.settled()

    expect(lnurlSends()).toEqual([
      expect.objectContaining({
        txid: 'ark-txid',
        target: TARGET,
        railId: LNURL_ARKADE_RAIL,
        amountSat: 2_100,
        feeSat: 0,
      }),
    ])
  })
})

describe('marking a receiver confirmation', () => {
  const storeRow = (txid: string) =>
    localStorage.setItem(
      LNURL_SENDS_STORAGE_KEY,
      JSON.stringify([{ txid, target: TARGET, railId: LNURL_ARKADE_RAIL, amountSat: 1, feeSat: 0, createdAt: 1 }]),
    )

  it('reports persistence failures without notifying readers of an unwritten confirmation', () => {
    storeRow('quota')
    const notify = vi.fn()
    const stop = subscribeLnurlSends(notify)
    const error = new Error('quota exceeded')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw error
    })

    markLnurlReceiverConfirmed('quota', true)
    stop()

    expect(reportError).toHaveBeenCalledWith(error, 'Failed to record lnurl send')
    expect(notify).not.toHaveBeenCalled()
    expect(lnurlSends()[0].receiverConfirmed).toBeUndefined()
  })
})

describe('the sent activity resolver', () => {
  it('labels a recorded send with its target, including one recorded after the first load', async () => {
    const resolver = createSentActivityResolver()
    await resolver.prepare?.()
    expect(resolver.resolve(sentTx('ark-txid'))).toBeUndefined()

    const handle = settledHandle('ark-txid')
    recordLnurlSend(handle, quote(LNURL_ARKADE_RAIL), TARGET)
    await handle.settled()
    await resolver.prepare?.()

    expect(resolver.resolve(sentTx('ark-txid'))).toEqual([
      expect.objectContaining({ groupId: 'sent:ark-txid', label: `→ ${TARGET}`, kind: 'lnurl-send' }),
    ])
    expect(resolver.resolve(sentTx('other-txid'))).toBeUndefined()
  })
})
