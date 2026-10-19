import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeHandle, type ArkTransaction, type RouteQuote } from '@arkade-os/sdk'
import { LNURL_ARKADE_RAIL, LNURL_LIGHTNING_RAIL } from '@arkade-os/lnurl-client/arkade'
import {
  createSentActivityResolver,
  forgetLnurlSends,
  lnurlSends,
  markLnurlReceiverConfirmed,
  recordLnurlSend,
  resumeLnurlConfirmations,
  subscribeLnurlSends,
  watchLnurlConfirmation,
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

const quote = (railId: string, over: Partial<RouteQuote> = {}): RouteQuote => ({
  railId,
  amount: 2_100,
  fee: 0,
  total: 2_100,
  meta: { lnurl: { target: TARGET, via: 'ark' } },
  send: async () => {
    throw new Error('not sent here')
  },
  ...over,
})

const sentTx = (arkTxid: string) =>
  ({ key: { arkTxid, boardingTxid: '', commitmentTxid: '' }, type: 'SENT', amount: 2_100 }) as ArkTransaction

describe('recording an LNURL send', () => {
  it('writes what was paid, to whom and by which rail, once the rail names a txid', async () => {
    const handle = makeHandle(LNURL_ARKADE_RAIL, async (emit) => {
      const result = { railId: 'ark', txid: 'ark-txid' }
      emit({ status: 'settled', result })
      return result
    })
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

  it('keeps one row per send as a swap reports more, and keeps its date', async () => {
    let emit: (u: never) => void = () => {}
    const handle = makeHandle(LNURL_LIGHTNING_RAIL, (e) => {
      emit = e as never
      return new Promise(() => {})
    })
    recordLnurlSend(handle, quote(LNURL_LIGHTNING_RAIL, { fee: 70, total: 2_170 }), TARGET)
    emit({ status: 'sent', result: { railId: 'lightning', txid: 'funding-txid', swapId: 'rfq-1' } } as never)
    const [first] = lnurlSends()
    emit({
      status: 'settled',
      result: { railId: 'lightning', txid: 'funding-txid', preimage: 'ab'.repeat(32) },
    } as never)

    expect(lnurlSends()).toEqual([
      { ...first, swapId: 'rfq-1', preimage: 'ab'.repeat(32), feeSat: 70, createdAt: first.createdAt },
    ])
  })

  it('records nothing for a send that never named a txid', async () => {
    const handle = makeHandle(LNURL_ARKADE_RAIL, async () => {
      throw new Error('refused')
    })
    recordLnurlSend(handle, quote(LNURL_ARKADE_RAIL), TARGET)
    await expect(handle.settled()).rejects.toThrow('refused')

    expect(lnurlSends()).toEqual([])
  })

  it('forgets active subscriptions before a reset can receive a late preimage', () => {
    let emit: (u: never) => void = () => {}
    const handle = makeHandle(LNURL_LIGHTNING_RAIL, (e) => {
      emit = e as never
      return new Promise(() => {})
    })
    recordLnurlSend(handle, quote(LNURL_LIGHTNING_RAIL), TARGET)
    emit({ status: 'sent', result: { railId: 'lightning', txid: 'funding-txid' } } as never)
    forgetLnurlSends()
    localStorage.clear()

    emit({
      status: 'settled',
      result: { railId: 'lightning', txid: 'funding-txid', preimage: 'ab'.repeat(32) },
    } as never)

    expect(lnurlSends()).toEqual([])
  })

  it('returns a cancellation function that stops recording updates', () => {
    let emit: (u: never) => void = () => {}
    const handle = makeHandle(LNURL_LIGHTNING_RAIL, (e) => {
      emit = e as never
      return new Promise(() => {})
    })
    const stop = recordLnurlSend(handle, quote(LNURL_LIGHTNING_RAIL), TARGET)
    stop()
    emit({ status: 'sent', result: { railId: 'lightning', txid: 'cancelled-txid' } } as never)
    expect(lnurlSends()).toEqual([])
  })
})

describe('resuming receiver confirmations', () => {
  const row = (txid: string, over: object = {}) => ({
    txid,
    target: TARGET,
    railId: LNURL_ARKADE_RAIL,
    amountSat: 2_100,
    feeSat: 0,
    createdAt: 1,
    ...over,
  })

  it('keeps the verify URLs the quote carried on the recorded send', async () => {
    const handle = makeHandle(LNURL_ARKADE_RAIL, async (emit) => {
      const result = { railId: 'ark', txid: 'ark-txid' }
      emit({ status: 'settled', result })
      return result
    })
    const meta = { lnurl: { target: TARGET, via: 'ark', verify: 'https://a/v/1', verifyBatch: 'https://a/batch' } }
    recordLnurlSend(handle, quote(LNURL_ARKADE_RAIL, { meta }), TARGET)
    await handle.settled()

    expect(lnurlSends()).toEqual([expect.objectContaining({ verify: 'https://a/v/1', verifyBatch: 'https://a/batch' })])
  })

  it('re-registers only sends still waiting on an answer, and records it when it comes', () => {
    localStorage.setItem(
      LNURL_SENDS_STORAGE_KEY,
      JSON.stringify([
        row('pending', { verify: 'https://a/v/1', verifyBatch: 'https://a/batch' }),
        row('answered', { verify: 'https://a/v/2', receiverConfirmed: false }),
        row('unverifiable'),
      ]),
    )

    resumeLnurlConfirmations()

    expect(addConfirmation).toHaveBeenCalledTimes(1)
    expect(addConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ verifyUrl: 'https://a/v/1', verifyBatch: 'https://a/batch', startedAt: 1 }),
    )
    addConfirmation.mock.calls[0][0].onSettled()
    expect(lnurlSends().find((s) => s.txid === 'pending')?.receiverConfirmed).toBe(true)
  })

  it('keeps expected payment identity on disk and passes it with the original deadline on resume', async () => {
    const expectPayment = { paymentOption: 'arkade', paymentDestination: 'ark1recipient' }
    const quoteSnapshot = { id: 'quote-1' }
    const handle = makeHandle(LNURL_ARKADE_RAIL, async (emit) => {
      const result = { railId: 'ark', txid: 'identity-txid' }
      emit({ status: 'settled', result })
      return result
    })
    recordLnurlSend(
      handle,
      quote(LNURL_ARKADE_RAIL, {
        meta: {
          lnurl: { target: TARGET, via: 'ark', verify: 'https://a/v', expect: expectPayment, quote: quoteSnapshot },
        },
      }),
      TARGET,
    )
    await handle.settled()
    const [stored] = lnurlSends()

    resumeLnurlConfirmations()

    expect(stored).toMatchObject({ expect: expectPayment, quote: quoteSnapshot })
    expect(addConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'identity-txid', expect: expectPayment, startedAt: stored.createdAt }),
    )
  })

  it('keys two sends independently even when they share a verify endpoint', () => {
    watchLnurlConfirmation('first', 'https://a/shared')
    watchLnurlConfirmation('second', 'https://a/shared')
    expect(addConfirmation.mock.calls.map(([entry]) => entry.key)).toEqual(['first', 'second'])
  })

  it('ignores an old confirmation callback after reset, including a reused txid', () => {
    localStorage.setItem(LNURL_SENDS_STORAGE_KEY, JSON.stringify([row('same', { verify: 'https://a/v' })]))
    resumeLnurlConfirmations()
    const old = addConfirmation.mock.calls[0][0]
    forgetLnurlSends()
    localStorage.clear()
    localStorage.setItem(LNURL_SENDS_STORAGE_KEY, JSON.stringify([row('same')]))
    old.onSettled()
    expect(lnurlSends()[0].receiverConfirmed).toBeUndefined()
  })
})

describe('marking a receiver confirmation', () => {
  it('reports persistence failures without notifying readers of an unwritten confirmation', () => {
    localStorage.setItem(
      LNURL_SENDS_STORAGE_KEY,
      JSON.stringify([
        {
          txid: 'quota',
          target: TARGET,
          railId: LNURL_ARKADE_RAIL,
          amountSat: 1,
          feeSat: 0,
          createdAt: 1,
        },
      ]),
    )
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
  it('notifies same-tab readers only after a successful write and supports cancellation', () => {
    localStorage.setItem(
      LNURL_SENDS_STORAGE_KEY,
      JSON.stringify([
        {
          txid: 'notify',
          target: TARGET,
          railId: LNURL_ARKADE_RAIL,
          amountSat: 1,
          feeSat: 0,
          createdAt: 1,
        },
      ]),
    )
    const notify = vi.fn(() => expect(lnurlSends()[0].receiverConfirmed).toBe(true))
    const stop = subscribeLnurlSends(notify)
    markLnurlReceiverConfirmed('notify', true)
    stop()
    markLnurlReceiverConfirmed('notify', false)
    expect(notify).toHaveBeenCalledTimes(1)
  })
  it('touches only receiverConfirmed, leaving the rest of the row alone', async () => {
    const handle = makeHandle(LNURL_ARKADE_RAIL, async (emit) => {
      const result = { railId: 'ark', txid: 'ark-txid' }
      emit({ status: 'settled', result })
      return result
    })
    recordLnurlSend(handle, quote(LNURL_ARKADE_RAIL), TARGET)
    await handle.settled()
    const [before] = lnurlSends()

    markLnurlReceiverConfirmed('ark-txid', true)

    expect(lnurlSends()).toEqual([{ ...before, receiverConfirmed: true }])
  })

  it('does nothing for a txid with no recorded send', () => {
    markLnurlReceiverConfirmed('never-sent', false)
    expect(lnurlSends()).toEqual([])
  })
})

describe('the sent activity resolver', () => {
  it('labels a recorded send with its target, including one recorded after the first load', async () => {
    const resolver = createSentActivityResolver()
    await resolver.prepare?.()
    expect(resolver.resolve(sentTx('ark-txid'))).toBeUndefined()

    const handle = makeHandle(LNURL_ARKADE_RAIL, async (emit) => {
      const result = { railId: 'ark', txid: 'ark-txid' }
      emit({ status: 'settled', result })
      return result
    })
    recordLnurlSend(handle, quote(LNURL_ARKADE_RAIL), TARGET)
    await handle.settled()
    await resolver.prepare?.()

    expect(resolver.resolve(sentTx('ark-txid'))).toEqual([
      expect.objectContaining({ groupId: 'sent:ark-txid', label: `→ ${TARGET}`, kind: 'lnurl-send' }),
    ])
    expect(resolver.resolve(sentTx('other-txid'))).toBeUndefined()
  })
})
