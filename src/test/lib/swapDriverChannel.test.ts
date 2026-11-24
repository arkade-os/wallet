import { afterEach, describe, expect, it, vi } from 'vitest'
import { openDriverChannel, type DriverUpdate } from '../../lib/swapDriverChannel'

describe('swapDriverChannel', () => {
  const opened: { close: () => void }[] = []
  const open = <T extends { close: () => void }>(channel: T): T => (opened.push(channel), channel)
  afterEach(() => {
    vi.useRealTimers()
    opened.splice(0).forEach((channel) => channel.close())
  })

  /** The tab with the swap client. */
  const serving = () => {
    const handler = vi.fn(async () => 'done')
    open(openDriverChannel()).serve(handler)
    return handler
  }

  /** Another tab's end of the channel, with every message it has seen. */
  const otherTab = () => {
    const channel = open(new BroadcastChannel('swap-driver'))
    const seen: { kind: string; id: string; token?: string }[] = []
    channel.onmessage = ({ data }) => seen.push(data)
    const next = (kind: string) =>
      vi.waitFor(() => {
        const message = seen.find((sent) => sent.kind === kind)
        if (!message) throw new Error(`no ${kind} yet`)
        return message
      })
    return { post: (message: unknown) => channel.postMessage(message), seen, next }
  }

  it('runs a request from another tab once that tab has the ack', async () => {
    const handler = serving()
    const watching = otherTab()
    await expect(open(openDriverChannel()).ask('receiveLightning', [1000])).resolves.toBe('done')
    expect(handler).toHaveBeenCalledExactlyOnceWith('receiveLightning', [1000])
    await watching.next('result')
    expect(watching.seen.map(({ kind }) => kind)).toEqual(['request', 'ack', 'confirm', 'result'])
  })

  it('runs a request only when the asking tab confirms that it got the ack', async () => {
    const handler = serving()
    const asking = otherTab()

    asking.post({ kind: 'request', id: 'r', op: 'acceptPay', args: ['quote-1'], confirms: true })
    const { token } = await asking.next('ack')
    asking.post({ kind: 'confirm', token: 'of another ack' })
    // Messages arrive in order, so the answer to this one proves that the first two were read.
    asking.post({ kind: 'request', id: 'older build', op: 'quotePay', args: ['bc1q'] })
    await asking.next('result')
    expect(handler).toHaveBeenCalledExactlyOnceWith('quotePay', ['bc1q'])

    asking.post({ kind: 'confirm', token })
    asking.post({ kind: 'confirm', token })
    await vi.waitFor(() => expect(asking.seen.filter(({ kind }) => kind === 'result')).toHaveLength(2))
    expect(handler).toHaveBeenCalledTimes(2)
    expect(handler).toHaveBeenLastCalledWith('acceptPay', ['quote-1'])
  })

  it('does not confirm an ack that arrives after it gave up', async () => {
    const update = { outcome: 'settled' } as unknown as DriverUpdate
    const holding = otherTab()
    const asking = open(openDriverChannel())
    asking.subscribe(() => asking.publish(update))

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const answer = asking.ask('acceptPay', ['quote-1'])
    vi.advanceTimersByTime(1_500)
    vi.useRealTimers()
    await expect(answer).rejects.toMatchObject({ name: 'DriverUnavailable' })

    const { id } = await holding.next('request')
    holding.post({ kind: 'ack', id, token: 'late' })
    holding.post({ kind: 'update', update })
    await holding.next('update')
    expect(holding.seen.map(({ kind }) => kind)).toEqual(['request', 'update'])
  })

  it('confirms one ack, so that a second tab does not run the request too', async () => {
    const holding = otherTab()
    const answer = open(openDriverChannel()).ask('acceptPay', ['quote-1'])

    const { id } = await holding.next('request')
    holding.post({ kind: 'ack', id, token: 'first' })
    holding.post({ kind: 'ack', id, token: 'second' })
    holding.post({ kind: 'result', id, ok: true, value: 'done' })
    await expect(answer).resolves.toBe('done')
    await holding.next('confirm')
    expect(holding.seen.filter(({ kind }) => kind === 'confirm')).toEqual([{ kind: 'confirm', token: 'first' }])
  })
})
