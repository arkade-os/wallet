import { btcOn, type AssetId, type Quote, type QuoteInput } from '@arkade-os/swap'
import { describe, expect, it, vi } from 'vitest'
import { assertJoinedQuotes, planSwapRoute, type DirectedSwapEdge } from '../../lib/swapRoutePlan'

const token = (digit: string): AssetId<'arkade'> => `arkade:bitcoin/asset:${digit.repeat(64)}0000`
const a = token('a')
const b = token('b')
const c = token('c')
const btc = btcOn('arkade', 'bitcoin')
const ln = btcOn('bolt11', 'bitcoin')
const edge = (from: AssetId, to: AssetId): DirectedSwapEdge => ({ from, to })
const exp = () => Math.floor(Date.now() / 1_000) + 60

function firmQuote(from: AssetId<'arkade'> | typeof ln, to: AssetId<'arkade'>, give: bigint, take: bigint): Quote {
  const wallet = { kind: 'wallet' } as const
  const fundingInvoice = { kind: 'invoice', bolt11: 'source-invoice' } as const
  const expiresAt = exp()
  const target = { corridor: 'arkade', asset: to, instrument: wallet } as const
  const route: Quote['route'] =
    from === ln
      ? {
          give: {
            corridor: 'lightning',
            asset: ln,
            instrument: { ...fundingInvoice, amount: give, expiresAt, paymentHash: '12'.repeat(32) },
          },
          take: target,
        }
      : { give: { corridor: 'arkade', asset: from as AssetId<'arkade'>, instrument: wallet }, take: target }
  return {
    id: `${from}/${to}`,
    route,
    give: { asset: from, amount: give },
    take: { asset: to, amount: take },
    fee: { asset: to, amount: 1n },
    market: { kind: 'restored', backend: 'rfq' },
    ...(from === ln ? { artifact: fundingInvoice } : {}),
    expiresAt,
  }
}

describe('firm swap route planning', () => {
  it('walks an exact-input path forward and splices the actual output of each leg into the next request', async () => {
    const first = firmQuote(a, b, 100n, 240n)
    const middle = firmQuote(b, btc, 240n, 500n)
    const last = firmQuote(btc, c, 500n, 18n)
    const quote = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(middle).mockResolvedValueOnce(last)
    const edges = [edge(a, b), edge(b, a), edge(b, btc), edge(btc, b), edge(btc, c), edge(a, b)]

    await expect(
      planSwapRoute('route', { from: a, to: c, amount: 100n, amountOn: 'give' }, edges, quote),
    ).resolves.toEqual({
      id: 'route',
      quotes: [first, middle, last],
      expiresAt: Math.min(first.expiresAt, middle.expiresAt, last.expiresAt),
    })
    expect(quote.mock.calls).toEqual([
      [{ give: a, take: b, amount: 100n, amountOn: 'give' }],
      [{ give: b, take: btc, amount: 240n, amountOn: 'give' }],
      [{ give: btc, take: c, amount: 500n, amountOn: 'give' }],
    ])
  })

  it('works backward from an exact asset delivery through the BTC wallet balance', async () => {
    const delivery = firmQuote(btc, c, 600n, 25n)
    const funding = { ...firmQuote(a, btc, 80n, 600n), expiresAt: delivery.expiresAt - 10 }
    const quote = vi.fn().mockResolvedValueOnce(delivery).mockResolvedValueOnce(funding)
    const edges = [edge(a, btc), edge(btc, c)]

    await expect(
      planSwapRoute('route', { from: a, to: c, amount: 25n, amountOn: 'take' }, edges, quote),
    ).resolves.toEqual({
      id: 'route',
      quotes: [funding, delivery],
      expiresAt: funding.expiresAt,
    })
    expect(quote.mock.calls).toEqual([
      [{ give: btc, take: c, amount: 25n, amountOn: 'take' }],
      [{ give: a, take: btc, amount: 600n, amountOn: 'take' }],
    ])
  })

  it('quotes an external Lightning invoice against the exact BTC debit of the asset purchase', async () => {
    const delivery = firmQuote(btc, b, 500n, 20n)
    const funding = firmQuote(ln, btc, 520n, 500n)
    const quote = vi.fn().mockResolvedValueOnce(delivery).mockResolvedValueOnce(funding)

    await expect(
      planSwapRoute('route', { from: ln, to: b, amount: 20n, amountOn: 'take' }, [edge(ln, btc), edge(btc, b)], quote),
    ).resolves.toMatchObject({ quotes: [funding, delivery] })
    expect(quote).toHaveBeenLastCalledWith({ give: ln, take: btc, amount: 500n, amountOn: 'take', via: 'lightning' })
  })

  it('takes a valid direct route before asking for any intermediary quotes', async () => {
    const direct = firmQuote(a, c, 100n, 25n)
    const quote = vi.fn().mockResolvedValue(direct)
    const edges = [edge(a, btc), edge(btc, c), edge(a, c)]

    await expect(
      planSwapRoute('route', { from: a, to: c, amount: 25n, amountOn: 'take' }, edges, quote),
    ).resolves.toMatchObject({
      quotes: [direct],
    })
    expect(quote).toHaveBeenCalledExactlyOnceWith({ give: a, take: c, amount: 25n, amountOn: 'take' })
  })

  it('falls back in deterministic shortest-path order after a refusal and a mismatched firm quote', async () => {
    const wrong = firmQuote(a, b, 101n, 110n)
    const funding = firmQuote(a, btc, 100n, 600n)
    const delivery = firmQuote(btc, c, 600n, 18n)
    const edges = [edge(a, btc), edge(btc, c), edge(a, c), edge(b, c), edge(a, b)]
    const quote = vi
      .fn<(input: QuoteInput) => Promise<Quote>>()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(wrong)
      .mockResolvedValueOnce(funding)
      .mockResolvedValueOnce(delivery)

    await expect(
      planSwapRoute('route', { from: a, to: c, amount: 100n, amountOn: 'give' }, edges, quote),
    ).resolves.toMatchObject({
      quotes: [funding, delivery],
    })
    expect(quote.mock.calls.map(([request]) => [request.give, request.take])).toEqual([
      [a, c],
      [a, b],
      [a, btc],
      [btc, c],
    ])
  })

  it('refuses a first leg that expired while the second was being quoted', async () => {
    const clock = vi.spyOn(Date, 'now')
    const first = firmQuote(a, btc, 100n, 600n)
    const quote = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockImplementationOnce(async () => {
        clock.mockReturnValue(first.expiresAt * 1_000)
        return firmQuote(btc, c, 600n, 10n)
      })

    await expect(
      planSwapRoute('route', { from: a, to: c, amount: 100n, amountOn: 'give' }, [edge(a, btc), edge(btc, c)], quote),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ message: expect.stringMatching(/expired/) }) })
    expect(quote).toHaveBeenCalledTimes(2)
  })

  it('does not quote cycles or cross-network intermediaries and bounds failing requests', async () => {
    const quote = vi.fn().mockRejectedValue(new Error('unavailable'))
    const mixed = btcOn('arkade', 'signet')
    const request = { from: a, to: c, amount: 100n, amountOn: 'give' } as const
    const disconnected = [edge(a, a), edge(a, b), edge(b, a), edge(a, mixed), edge(mixed, c)]
    await expect(planSwapRoute('route', request, disconnected, quote)).rejects.toThrow('No firm swap route')
    expect(quote).not.toHaveBeenCalled()

    const candidates = [...'123456789'].flatMap((digit) => [edge(a, token(digit)), edge(token(digit), c)])
    await expect(planSwapRoute('route', request, candidates, quote)).rejects.toThrow('No firm swap route')
    expect(quote).toHaveBeenCalledTimes(8)
  })
})

describe('joining reviewed quotes', () => {
  it('accepts a separately reviewed terminal Lightning invoice and uses its expiry', () => {
    const funding = firmQuote(a, btc, 20n, 600n)
    const invoiceExpiry = funding.expiresAt - 10
    const pay: Quote = {
      ...firmQuote(btc, c, 600n, 585n),
      route: {
        give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
        take: {
          corridor: 'lightning',
          asset: ln,
          instrument: {
            kind: 'invoice',
            bolt11: 'payee-invoice',
            paymentHash: '34'.repeat(32),
            expiresAt: invoiceExpiry,
          },
        },
      },
      take: { asset: ln, amount: 585n },
    }

    expect(assertJoinedQuotes([funding, pay])).toBe(invoiceExpiry)
    expect(() => assertJoinedQuotes([{ ...funding, take: { ...funding.take, amount: 599n } }, pay])).toThrow(
      'exact wallet balance',
    )
    expect(() => assertJoinedQuotes([funding, { ...pay, id: funding.id }])).toThrow('loop')
  })

  it('rejects external intermediaries, feed prices, or an incorrect declared corridor', () => {
    const funding = firmQuote(a, btc, 20n, 600n)
    const delivery = firmQuote(btc, c, 600n, 18n)
    const toOtherWallet: Quote = {
      ...funding,
      route: {
        ...funding.route,
        take: { corridor: 'arkade', asset: btc, instrument: { kind: 'address', address: 'other' } },
      },
    }
    expect(() => assertJoinedQuotes([toOtherWallet, delivery])).toThrow('exact wallet balance')
    expect(() => assertJoinedQuotes([{ ...funding, market: { kind: 'restored', backend: 'feed' } }])).toThrow('firm')
    const wrongCorridor = {
      ...funding,
      route: { ...funding.route, take: { ...funding.route.take, corridor: 'lightning' } },
    } as unknown as Quote
    expect(() => assertJoinedQuotes([wrongCorridor])).toThrow('firm')
  })
})
