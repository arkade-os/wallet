import { beforeEach, describe, expect, it } from 'vitest'
import { makeHandle, type ArkTransaction, type RouteQuote } from '@arkade-os/sdk'
import { LNURL_ARKADE_RAIL, LNURL_LIGHTNING_RAIL } from '@arkade-os/lnurl-client/arkade'
import {
  createSentActivityResolver,
  lnurlSends,
  markLnurlReceiverConfirmed,
  recordLnurlSend,
} from '../../lib/lnurlSends'

beforeEach(() => localStorage.clear())

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
})

describe('marking a receiver confirmation', () => {
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
