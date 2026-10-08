import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, configure, renderHook, waitFor } from '@testing-library/react'
import { createLnurlClient, tokenOptions, type PayRequest, type TokenOption } from '@arkade-os/lnurl-client'
import type { Receiver } from '@arkade-os/lnurl-client/arkade'
import { lnurlTokenRails, plausibleQuote, useLnurlTokenRails, wholeTokens } from '../../../lib/receive/lnurlTokenRails'
import { FiatContext } from '../../../providers/fiat'
import { Currencies } from '../../../lib/types'
import {
  BTC_USD,
  LNURL_BASE,
  TOKEN_DEPOSITS,
  TOKEN_OPTIONS,
  TOKEN_UNITS,
  arbitrumUri,
  fakeLnurlServer,
  holdQuotes,
} from './fakeLnurlServer'

configure({ asyncUtilTimeout: 3_000 })

// Passes through, so one test can hand lnurlTokenRails an option the real client never returns.
vi.mock('@arkade-os/lnurl-client', async (importOriginal) => {
  const client = await importOriginal<typeof import('@arkade-os/lnurl-client')>()
  return { ...client, tokenOptions: vi.fn(client.tokenOptions) }
})

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

  it('omits an option that comes back without an asset', () => {
    const [option] = tokenOptions(payRequest(TOKEN_OPTIONS))
    vi.mocked(tokenOptions).mockReturnValueOnce([{ ...option, asset: undefined } as unknown as TokenOption])

    expect(lnurlTokenRails(payRequest(TOKEN_OPTIONS), 20_000)).toEqual([])
  })
})

describe('wholeTokens', () => {
  it('reads plain base units as the exact token amount', () => {
    expect(wholeTokens('17156000', 6)).toBe('17.156')
  })

  it.each(['17.156', '', '1e7', '0', '007'])('refuses %j as unreadable', (raw) => {
    expect(wholeTokens(raw, 6)).toBeUndefined()
  })
})

describe('plausibleQuote', () => {
  it('accepts a stablecoin quote within 0.8x to 1.25x of what the sats are worth', () => {
    expect(['8', '10', '12.5'].map((tokens) => plausibleQuote('USDT', tokens, 10))).toEqual([true, true, true])
  })

  it('refuses one outside that band', () => {
    expect(['7.99', '12.51', '171.56'].map((tokens) => plausibleQuote('USDC', tokens, 10))).toEqual([
      false,
      false,
      false,
    ])
  })

  it('has no opinion without a price, or for a unit that is not USD', () => {
    expect(plausibleQuote('USDT', '171.56', 0)).toBe(true)
    expect(plausibleQuote('EURC', '171.56', 10)).toBe(true)
  })
})

describe('useLnurlTokenRails', () => {
  let server: ReturnType<typeof fakeLnurlServer>
  const serve = (opts: Omit<Parameters<typeof fakeLnurlServer>[0], 'modes'> = {}) => {
    server = fakeLnurlServer({ modes: ['self'], tokens: true, ...opts })
    vi.stubGlobal('fetch', server.fetch)
  }
  const receiver = { payRequest: () => createLnurlClient().resolve('alice@lnurl.test') } as unknown as Receiver
  // Every render's output: a render the effect has not caught up with is still something a caller shows.
  let seen: ReturnType<typeof useLnurlTokenRails>[] = []
  const renderTokens = (selected?: string, enabled = true) => {
    seen = []
    return renderHook(
      (props) => {
        const out = useLnurlTokenRails(receiver, props.amountSat, enabled, props.selected)
        seen.push(out)
        return out
      },
      { initialProps: { selected, amountSat: 20_000 } },
    )
  }
  const staleSince = (from: number) => seen.slice(from).filter((r) => r.quote || !r.quoting)
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

  it('exposes no quote for the old amount while the new one is asked for', async () => {
    serve()
    const { result, rerender } = renderTokens('ff-usdtarbitrum')
    await waitFor(() => expect(result.current.quote?.amount).toBe('17.156'))
    const pending = holdQuotes(server, 'ff-usdtarbitrum')
    const from = seen.length

    rerender({ selected: 'ff-usdtarbitrum', amountSat: 30_000 })
    await waitFor(() => expect(pending.held).toHaveLength(1))

    expect(staleSince(from)).toEqual([])
    pending.release()
    await waitFor(() => expect(result.current.quote?.amount).toBe('25.734'))
  })

  it('exposes no quote for the old option while the new one is asked for', async () => {
    serve()
    const { result, rerender } = renderTokens('ff-usdtarbitrum')
    await waitFor(() => expect(result.current.quote?.optionId).toBe('ff-usdtarbitrum'))
    const pending = holdQuotes(server, 'ff-usdttrc')
    const from = seen.length

    rerender({ selected: 'ff-usdttrc', amountSat: 20_000 })
    await waitFor(() => expect(pending.held).toHaveLength(1))

    expect(staleSince(from)).toEqual([])
    pending.release()
    await waitFor(() => expect(result.current.quote?.optionId).toBe('ff-usdttrc'))
  })

  it('does not bring back the old quote of an option picked again before the other answers', async () => {
    serve()
    const { result, rerender } = renderTokens('ff-usdtarbitrum')
    await waitFor(() => expect(result.current.quote?.optionId).toBe('ff-usdtarbitrum'))
    const tron = holdQuotes(server, 'ff-usdttrc')
    rerender({ selected: 'ff-usdttrc', amountSat: 20_000 })
    await waitFor(() => expect(tron.held).toHaveLength(1))
    const arbitrum = holdQuotes(server, 'ff-usdtarbitrum')
    const from = seen.length

    rerender({ selected: 'ff-usdtarbitrum', amountSat: 20_000 })
    await waitFor(() => expect(arbitrum.held).toHaveLength(1))

    expect(staleSince(from)).toEqual([])
    tron.release()
    arbitrum.release()
    await waitFor(() => expect(result.current.quote?.optionId).toBe('ff-usdtarbitrum'))
  })

  it('refuses a quote far from what the amount is worth at the BTC price the wallet shows', async () => {
    serve({ paymentAmount: '171560000' })
    const atMarket = ({ children }: { children: ReactNode }) =>
      createElement(
        FiatContext.Provider,
        {
          value: {
            toFiatAmount: (sats: number, currency: Currencies) =>
              currency === Currencies.USD ? (sats * BTC_USD) / 1e8 : 0,
          } as never,
        },
        children,
      )
    const { result } = renderHook(() => useLnurlTokenRails(receiver, 20_000, true, 'ff-usdtarbitrum'), {
      wrapper: atMarket,
    })

    await waitFor(() => expect(result.current.error).toMatch(/171\.56 USDT is far from/))
    expect(result.current.quote).toBeUndefined()
  })

  it('takes the quote as given while the wallet has no BTC price', async () => {
    serve({ paymentAmount: '171560000' })
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.quote?.amount).toBe('171.56'))
  })

  it('refuses a quote whose amount is not plain base units', async () => {
    serve({ paymentAmount: '007' })
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.error).toMatch(/amount is unreadable/))
    expect(result.current.quote).toBeUndefined()
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

    it('asks for a new quote once the quote expires, exposing the expired one no more', async () => {
      serve({ quoteTtlMs: 61_000 })
      const { result } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.quote).toBeDefined())
      const pending = holdQuotes(server, 'ff-usdtarbitrum')
      const from = seen.length

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })
      await waitFor(() => expect(pending.held).toHaveLength(1))

      expect(staleSince(from)).toEqual([])
      pending.release()
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
