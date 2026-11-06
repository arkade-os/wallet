import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, configure, renderHook, waitFor } from '@testing-library/react'
import { createLnurlClient, tokenOptions, type PayRequest, type TokenOption } from '@arkade-os/lnurl-client'
import type { Receiver } from '@arkade-os/lnurl-client/arkade'
import { lnurlTokenRails, plausibleQuote, useLnurlTokenRails } from '../../../lib/receive/lnurlTokenRails'
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
  solanaUri,
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
    ['no verifiable flag', { verifiable: undefined }],
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

  it('keeps the wallet decimal limit when the client supports more precision', () => {
    const request = payRequest(TOKEN_OPTIONS)
    request.units = [{ ...TOKEN_UNITS[0], decimals: 19 }]

    expect(tokenOptions(request)).toHaveLength(2)
    expect(lnurlTokenRails(request, 20_000)).toEqual([])
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
  const receiver = {
    lnurl: 'LNURL1ALICE',
    payRequest: () => createLnurlClient().resolve('alice@lnurl.test'),
  } as unknown as Receiver
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

  it('says which options an amount would be offered, once the payRequest is in', async () => {
    serve()
    const { result } = renderTokens()
    expect(result.current.offers(20_000, 'ff-usdtarbitrum')).toBe(false)

    await waitFor(() => expect(result.current.rails).toHaveLength(2))
    expect(result.current.offers(20_000, 'ff-usdtarbitrum')).toBe(true)
    expect(result.current.offers(5_000, 'ff-usdttrc')).toBe(false)
    expect(result.current.offers(20_000, 'ff-unknown')).toBe(false)
    expect(result.current.offers(20_000, undefined)).toBe(false)
    expect(result.current.offers(0, 'ff-usdtarbitrum')).toBe(false)
  })

  it('keeps regenerate the same function across renders', async () => {
    serve()
    const { result, rerender } = renderTokens()
    const first = result.current.regenerate

    rerender({ selected: undefined, amountSat: 25_000 })
    expect(result.current.regenerate).toBe(first)
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

  it('shows a replaced receiver neither the old options nor the old quote', async () => {
    serve()
    let fetchBob!: () => void
    const bobFetched = new Promise<void>((resolve) => (fetchBob = resolve))
    const bob = {
      lnurl: 'LNURL1BOB',
      payRequest: async () => {
        await bobFetched
        return createLnurlClient().resolve('bob@lnurl.test')
      },
    } as unknown as Receiver
    seen = []
    const { result, rerender } = renderHook(
      (props) => {
        const out = useLnurlTokenRails(props.receiver, 20_000, true, 'ff-usdtarbitrum')
        seen.push(out)
        return out
      },
      { initialProps: { receiver } },
    )
    await waitFor(() => expect(result.current.quote).toBeDefined())
    const from = seen.length

    rerender({ receiver: bob })
    await act(async () => {})

    expect(seen.slice(from).filter((r) => r.quote || r.rails.length)).toEqual([])
    const pending = holdQuotes(server, 'ff-usdtarbitrum')
    fetchBob()
    await waitFor(() => expect(pending.held).toHaveLength(1))
    expect(pending.held[0].pathname).toBe('/callback/bob')
    expect(seen.slice(from).filter((r) => r.quote)).toEqual([])
    pending.release()
    await waitFor(() => expect(result.current.quote).toBeDefined())
  })

  const quotedUri = arbitrumUri(20_000_000)
  const deposit = TOKEN_DEPOSITS['ff-usdtarbitrum']
  it.each([
    ['another recipient', quotedUri.replace(`address=${deposit}`, `address=0x${'cd'.repeat(20)}`)],
    ['a second, conflicting recipient', `${quotedUri}&address=0x${'cd'.repeat(20)}`],
    ['an extra Ethereum argument', `${quotedUri}&memo=invoice`],
    ['a fragment', `${quotedUri}#invoice`],
  ])('shows the bare deposit address, not a URI with %s', async (_, paymentURI) => {
    serve({ paymentURI })
    const { result } = renderTokens('ff-usdtarbitrum')
    await waitFor(() => expect(result.current.quote).toBeDefined())
    expect(result.current.quote!.value).toBe(TOKEN_DEPOSITS['ff-usdtarbitrum'])
  })

  const solanaQuote = solanaUri(20_000_000)
  it('keeps a Solana Pay URI that names each bound field once', async () => {
    serve({ simulated: true })
    const { result } = renderTokens('ffsim-usdtsol')
    await waitFor(() => expect(result.current.quote).toBeDefined())
    expect(result.current.quote!.value).toBe(solanaQuote)
  })

  it.each([
    ['the amount repeated', `${solanaQuote}&amount=1`],
    ['a duplicate memo', `${solanaQuote}&memo=invoice&memo=invoice`],
  ])('shows the bare Solana deposit, not a URI with %s', async (_, paymentURI) => {
    serve({ paymentURI, simulated: true })
    const { result } = renderTokens('ffsim-usdtsol')
    await waitFor(() => expect(result.current.quote).toBeDefined())
    expect(result.current.quote!.value).toBe(TOKEN_DEPOSITS['ffsim-usdtsol'])
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

  it('preserves the wallet refusal of noncanonical base units accepted by the client', async () => {
    serve({ paymentAmount: '007' })
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.error).toMatch(/amount is unreadable/))
    expect(result.current.quote).toBeUndefined()
  })

  it.each([
    ['an invalid option', { tokenOption: 'ff-usdttrc' }],
    ['an invalid recipient', { tokenDestination: 'not-an-address' }],
    ['an invalid unit', { paymentUnit: 'BTC' }],
    ['zero base units', { paymentAmount: '0' }],
    ['fractional base units', { paymentAmount: '17.156' }],
    ['overlong base units', { paymentAmount: '1'.repeat(79) }],
    ['an invalid expiry', { quoteExpiresAt: 'not-a-date' }],
    ['an expired quote', { quoteTtlMs: -1_000 }],
  ])('surfaces shared validation for %s without offering a quote', async (_, override) => {
    serve(override)
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.error).not.toBe(''))
    expect(result.current.quote).toBeUndefined()
    expect(quotes()).toHaveLength(1)
  })

  it('refuses a deposit that needs a memo the QR cannot carry', async () => {
    serve({ tokenTag: '12345' })
    const { result } = renderTokens('ff-usdtarbitrum')

    await waitFor(() => expect(result.current.error).toMatch(/memo/))
    expect(result.current.quote).toBeUndefined()
  })

  it('refuses even a valid Solana memo URI because address copy would lose the memo', async () => {
    serve({ simulated: true, tokenTag: 'invoice', paymentURI: `${solanaQuote}&memo=invoice` })
    const { result } = renderTokens('ffsim-usdtsol')

    await waitFor(() => expect(result.current.error).toMatch(/memo/))
    expect(result.current.quote).toBeUndefined()
  })

  describe('at expiry', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())

    it('expires without asking again, and regenerates on request', async () => {
      serve({ quoteTtlMs: 61_000 })
      const { result } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.quote).toBeDefined())

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })

      expect(result.current.expired).toBe(true)
      expect(result.current.quote).toBeUndefined()
      expect(quotes()).toHaveLength(1)

      const pending = holdQuotes(server, 'ff-usdtarbitrum')
      const from = seen.length
      act(() => result.current.regenerate())
      await waitFor(() => expect(pending.held).toHaveLength(1))
      expect(result.current.quote).toBeUndefined()
      expect(staleSince(from)).toEqual([])

      pending.release()
      await waitFor(() => expect(quotes()).toHaveLength(2))
      await waitFor(() => expect(result.current.quote).toBeDefined())
      expect(result.current.expired).toBe(false)
    })

    it('expires a quote whose deadline passed while its timer was held back', async () => {
      serve({ quoteTtlMs: 120_000 })
      const { result } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.quote).toBeDefined())

      vi.setSystemTime(result.current.quote!.expiresAt)
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(result.current.expired).toBe(true)
      expect(result.current.quote).toBeUndefined()
      expect(quotes()).toHaveLength(1)
    })

    it('does not report a quote asked after an expiry, for a new amount, as expired', async () => {
      serve({ quoteTtlMs: 61_000 })
      const { result, rerender } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.quote).toBeDefined())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })
      expect(result.current.expired).toBe(true)

      rerender({ selected: 'ff-usdtarbitrum', amountSat: 30_000 })
      await waitFor(() => expect(result.current.quote).toBeDefined())
      expect(result.current.expired).toBe(false)
    })

    it('does not report a quote as expired when the amount changed before the old one expired', async () => {
      serve({ quoteTtlMs: 120_000 })
      const { result, rerender } = renderTokens('ff-usdtarbitrum')
      await waitFor(() => expect(result.current.quote).toBeDefined())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })

      rerender({ selected: 'ff-usdtarbitrum', amountSat: 30_000 })
      await waitFor(() => expect(result.current.quote).toBeDefined())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100_000)
      })

      expect(result.current.expired).toBe(false)
      expect(result.current.quote).toBeDefined()
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
