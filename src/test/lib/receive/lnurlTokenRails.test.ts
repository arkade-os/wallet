import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, configure, renderHook, waitFor } from '@testing-library/react'
import { createLnurlClient, type PayRequest } from '@arkade-os/lnurl-client'
import type { Receiver } from '@arkade-os/lnurl-client/arkade'
import { lnurlTokenRails, useLnurlTokenRails } from '../../../lib/receive/lnurlTokenRails'
import { LNURL_BASE, TOKEN_DEPOSITS, TOKEN_OPTIONS, TOKEN_UNITS, arbitrumUri, fakeLnurlServer } from './fakeLnurlServer'

configure({ asyncUtilTimeout: 3_000 })

const payRequest = (paymentOptions: object[]): PayRequest => ({
  tag: 'payRequest',
  callback: `${LNURL_BASE}/callback/alice`,
  minSendable: 1_000,
  maxSendable: 100_000_000_000,
  metadata: '[]',
  paymentOptions: paymentOptions as PayRequest['paymentOptions'],
  units: TOKEN_UNITS,
  source: { url: `${LNURL_BASE}/.well-known/lnurlp/alice`, surface: 'address' },
})

describe('lnurlTokenRails', () => {
  it('returns one entry per advertised token option', () => {
    const rails = lnurlTokenRails(payRequest([{ id: 'lightning', type: 'lightning' }, ...TOKEN_OPTIONS]), 20_000)

    expect(rails.map((r) => [r.id, r.unit.code, r.chain, r.provider])).toEqual([
      ['ff-usdtarbitrum', 'USDT', 'Arbitrum One', 'FixedFloat'],
      ['ff-usdttrc', 'USDT', 'Tron', 'FixedFloat'],
    ])
  })

  it.each([
    ['available: false', { available: false }],
    ['verifiable: false', { verifiable: false }],
    ['no provider', { provider: undefined }],
  ])('omits an option with %s', (_, override) => {
    const rails = lnurlTokenRails(payRequest([{ ...TOKEN_OPTIONS[0], ...override }, TOKEN_OPTIONS[1]]), 20_000)

    expect(rails.map((r) => r.id)).toEqual(['ff-usdttrc'])
  })

  it('omits an option whose bounds exclude the amount', () => {
    // 5 000 sats clears Arbitrum's 2 844 minimum, not Tron's 11 996.
    expect(lnurlTokenRails(payRequest(TOKEN_OPTIONS), 5_000).map((r) => r.id)).toEqual(['ff-usdtarbitrum'])
  })
})

describe('useLnurlTokenRails', () => {
  let server: ReturnType<typeof fakeLnurlServer>
  const serve = (opts: Omit<Parameters<typeof fakeLnurlServer>[0], 'modes'> = {}) => {
    server = fakeLnurlServer({ modes: ['self'], tokens: true, ...opts })
    vi.stubGlobal('fetch', server.fetch)
  }
  const receiver = { payRequest: () => createLnurlClient().resolve('alice@lnurl.test') } as unknown as Receiver
  const renderTokens = (selected?: string, enabled = true) =>
    renderHook((props) => useLnurlTokenRails(receiver, props.amountSat, enabled, props.selected), {
      initialProps: { selected, amountSat: 20_000 },
    })
  const quotes = () =>
    server.fetch.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.startsWith('/callback/'))

  afterEach(() => vi.unstubAllGlobals())

  it('fetches nothing when disabled', async () => {
    serve()
    const { result } = renderTokens('ff-usdtarbitrum', false)

    await act(async () => {})
    expect(result.current.rails).toEqual([])
    expect(server.fetch).not.toHaveBeenCalled()
  })

  it('asks for no quote until an option is picked', async () => {
    serve()
    const { result } = renderTokens()

    await waitFor(() => expect(result.current.rails).toHaveLength(2))
    expect(quotes()).toHaveLength(0)
  })

  it('quotes the picked option: its URI, its exact amount and its deadline', async () => {
    serve()
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.quote).toBeDefined())
    expect(result.current.quote).toMatchObject({
      optionId: 'ff-usdtarbitrum',
      value: arbitrumUri(20_000_000),
      destination: TOKEN_DEPOSITS['ff-usdtarbitrum'],
      amount: '17.156',
    })
    expect(result.current.quote!.expiresAt).toBeGreaterThan(Date.now())
    expect(quotes().map((url) => [url.searchParams.get('paymentOption'), url.searchParams.get('amount')])).toEqual([
      ['ff-usdtarbitrum', '20000000'],
    ])
  })

  it('surfaces a per-option error without failing the others', async () => {
    serve({ tokenErrors: { 'ff-usdtarbitrum': 'paymentOption ff-usdtarbitrum is busy, try again shortly' } })
    const { result, rerender } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.error).toMatch(/busy/))
    expect(result.current.quote).toBeUndefined()
    expect(result.current.rails).toHaveLength(2)

    rerender({ selected: 'ff-usdttrc', amountSat: 20_000 })
    await waitFor(() => expect(result.current.quote?.optionId).toBe('ff-usdttrc'))
    expect(result.current.error).toBe('')
  })

  it('re-requests when the amount changes', async () => {
    serve()
    const { result, rerender } = renderTokens('ff-usdtarbitrum')
    await waitFor(() => expect(result.current.quote?.amount).toBe('17.156'))

    rerender({ selected: 'ff-usdtarbitrum', amountSat: 30_000 })

    await waitFor(() => expect(result.current.quote?.amount).toBe('25.734'))
    expect(quotes().map((url) => url.searchParams.get('amount'))).toEqual(['20000000', '30000000'])
  })

  it('refuses a deposit that needs a memo the QR cannot carry', async () => {
    serve({ tokenTag: '12345' })
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.error).toMatch(/memo/))
    expect(result.current.quote).toBeUndefined()
  })

  describe('at expiry', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())

    it('asks for a new quote once the quote expires', async () => {
      serve({ quoteTtlMs: 61_000 })
      const { result } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.quote).toBeDefined())

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })

      await waitFor(() => expect(quotes()).toHaveLength(2))
      await waitFor(() => expect(result.current.quote).toBeDefined())
    })

    it('refuses a quote that leaves under a minute instead of re-asking in a loop', async () => {
      serve({ quoteTtlMs: 30_000 })
      const { result } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.error).toMatch(/clock/))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000)
      })

      expect(quotes()).toHaveLength(1)
      expect(result.current.quote).toBeUndefined()
    })
  })
})
