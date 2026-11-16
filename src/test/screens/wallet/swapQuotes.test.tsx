import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OpenRfqAuction, OpenRfqOffer, Quote } from '@arkade-os/swap'
import QuoteChoices, { formatQuoteAmount } from '../../../screens/Wallet/Swap/QuoteChoices'
import { SwapsContext } from '../../../providers/swaps'
import { btcUsdt, USDT_ID } from '../../lib/swapFixtures'

vi.mock('../../../providers/swaps', async () => {
  const { createContext } = await import('react')
  return { SwapsContext: createContext({}) }
})

const openSwapQuotes = vi.fn()
const cancelOpenSwapQuotes = vi.fn().mockResolvedValue(undefined)
const chooseSwapQuote = vi.fn()
const onChoose = vi.fn()
const onSmartRouting = vi.fn()
const from = { assetId: 'btc', ticker: 'sats', decimals: 0 }
const to = { assetId: USDT_ID, ticker: 'USD', decimals: 2 }
const offer = (id: string, amount: bigint, expiresAt = Math.floor(Date.now() / 1000) + 60) =>
  ({
    id,
    solverPubkey: id.repeat(64).slice(0, 64),
    solverName: `Solver ${id}`,
    market: btcUsdt,
    fromAmount: 10_000n,
    toAmount: amount,
    expiresAt,
    signedCard: {},
  }) as OpenRfqOffer
const auction = (bids: OpenRfqOffer[]): OpenRfqAuction => ({
  id: 'auction',
  input: {
    give: 'arkade:mutinynet/slip44:1',
    take: `arkade:mutinynet/asset:${USDT_ID}`,
    amount: 10_000n,
    amountOn: 'give',
  },
  pair: `arkade:mutinynet/slip44:1~arkade:mutinynet/asset:${USDT_ID}`,
  closedAt: Math.floor(Date.now() / 1000),
  bids,
})
let quote: Quote

function contents(props: Partial<ComponentProps<typeof QuoteChoices>> = {}) {
  return (
    <SwapsContext.Provider
      value={
        { openSwapQuotes, cancelOpenSwapQuotes, chooseSwapQuote } as unknown as ComponentProps<
          typeof SwapsContext.Provider
        >['value']
      }
    >
      <QuoteChoices
        open
        network='mutinynet'
        from={from}
        to={to}
        amount={10_000n}
        automaticAmount={990n}
        onOpenChange={vi.fn()}
        onSmartRouting={onSmartRouting}
        onChoose={onChoose}
        {...props}
      />
    </SwapsContext.Provider>
  )
}

const show = (props: Partial<ComponentProps<typeof QuoteChoices>> = {}) => render(contents(props))

describe('Open swap quote choices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    quote = {
      id: 'quote',
      give: { asset: 'arkade:mutinynet/slip44:1', amount: 10_000n },
      take: { asset: `arkade:mutinynet/asset:${USDT_ID}`, amount: 995n },
      fee: { asset: 'arkade:mutinynet/slip44:1', amount: 30n },
      route: {
        give: { corridor: 'arkade', asset: 'arkade:mutinynet/slip44:1', instrument: { kind: 'wallet' } },
        take: { corridor: 'arkade', asset: `arkade:mutinynet/asset:${USDT_ID}`, instrument: { kind: 'wallet' } },
      },
      market: {
        kind: 'card',
        key: `arkade:btc/arkade:${USDT_ID}`,
        backend: 'feed',
        source: 'local:test',
        sourceType: 'local',
        solver: 'Test solver',
        pair: btcUsdt.pair ?? 'BTC/USDT',
        snapshot: { fetchedAt: Date.now(), live: true, source: 'injected' },
      },
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    }
    openSwapQuotes.mockResolvedValue(auction([offer('a', 1_000n), offer('b', 995n)]))
    chooseSwapQuote.mockResolvedValue(quote)
  })
  afterEach(() => vi.useRealTimers())

  it('discloses public pair and amount before broadcasting and keeps routing available', () => {
    show()
    expect(screen.getByText('Searching shares your pair and amount publicly.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Use smart routing' })).toHaveAccessibleDescription('9.9 USD')
    expect(openSwapQuotes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use smart routing' }))
    expect(onSmartRouting).toHaveBeenCalledOnce()
    expect(openSwapQuotes).not.toHaveBeenCalled()
  })

  it('starts open offers once when saved routing cannot serve the swap', async () => {
    const view = show({ autoSearch: true, automaticAmount: undefined })
    await screen.findByText('Solver b')
    expect(openSwapQuotes).toHaveBeenCalledOnce()
    view.rerender(contents({ autoSearch: true, automaticAmount: undefined }))
    expect(openSwapQuotes).toHaveBeenCalledOnce()
  })

  it('does not repeatedly retry a failed automatic search', async () => {
    openSwapQuotes.mockRejectedValue(new Error('Open offer relay unavailable'))
    const view = show({ autoSearch: true })
    await screen.findByText('Open offer relay unavailable')
    view.rerender(contents({ autoSearch: true }))
    expect(openSwapQuotes).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    await waitFor(() => expect(openSwapQuotes).toHaveBeenCalledTimes(2))
  })

  it('waits for the quote drawer before automatically searching and cancels on close', async () => {
    openSwapQuotes.mockReturnValue(new Promise(() => undefined))
    const view = show({ autoSearch: true, open: false })
    expect(openSwapQuotes).not.toHaveBeenCalled()
    view.rerender(contents({ autoSearch: true }))
    await waitFor(() => expect(openSwapQuotes).toHaveBeenCalledOnce())
    view.rerender(contents({ autoSearch: true, open: false }))
    expect(cancelOpenSwapQuotes).toHaveBeenCalledWith(expect.any(String))
  })

  it('lets the user choose a lower-ranked offer and verifies it before review', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    await screen.findByText('Solver b')
    expect(localStorage.getItem('solverCards')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Select Solver b' }))
    expect(chooseSwapQuote).toHaveBeenCalledWith('auction', 'b')
    await waitFor(() => expect(onChoose).toHaveBeenCalledWith(quote, expect.objectContaining({ id: 'b' })))
  })

  it('preserves exact large atomic amounts when formatting offers', () => {
    expect(formatQuoteAmount(123456789012345678901234567890n, 18)).toBe('123456789012.34567890123456789')
    expect(formatQuoteAmount(-123n, 2)).toBe('-1.23')
  })

  it('prevents duplicate chosen-provider requests while verification is pending', async () => {
    chooseSwapQuote.mockReturnValue(new Promise(() => undefined))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    const chooseButton = await screen.findByRole('button', { name: 'Select Solver a' })
    fireEvent.click(chooseButton)
    fireEvent.click(chooseButton)
    expect(chooseSwapQuote).toHaveBeenCalledOnce()
    expect(onChoose).not.toHaveBeenCalled()
  })

  it('does not select expired offers and makes refresh available', async () => {
    openSwapQuotes.mockResolvedValue(auction([offer('a', 1_000n, Math.floor(Date.now() / 1000) - 1)]))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    await screen.findByText('Solver a')
    expect(screen.getByRole('button', { name: 'Select Solver a' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Refresh offers' })).toBeEnabled()
    expect(chooseSwapQuote).not.toHaveBeenCalled()
  })

  it('ranks fresh offers ahead of a higher expired offer', async () => {
    openSwapQuotes.mockResolvedValue(
      auction([offer('a', 2_000n, Math.floor(Date.now() / 1000) - 1), offer('b', 1_000n)]),
    )
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    await screen.findByText('Solver b')
    expect(screen.getByText('Best').closest('article')).toHaveTextContent('Solver b')
  })

  it.each([
    { change: 'amount', next: { amount: 20_000n } },
    { change: 'asset precision', next: { to: { ...to, decimals: 3 } } },
  ])('ignores a late auction after the $change changes and cancels the request', async ({ next }) => {
    let resolve!: (value: OpenRfqAuction) => void
    openSwapQuotes.mockReturnValue(new Promise<OpenRfqAuction>((done) => (resolve = done)))
    const view = show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    view.rerender(contents(next))
    await act(async () => resolve(auction([offer('a', 1_000n)])))
    expect(screen.queryByText('Solver a')).not.toBeInTheDocument()
    expect(cancelOpenSwapQuotes).toHaveBeenCalledWith(expect.any(String))
    expect(onChoose).not.toHaveBeenCalled()
  })

  it('ignores selected-provider verification after the comparison closes', async () => {
    let resolve!: (value: Quote) => void
    chooseSwapQuote.mockReturnValue(new Promise<Quote>((done) => (resolve = done)))
    const view = show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select Solver a' }))
    view.rerender(contents({ open: false }))
    await act(async () => resolve(quote))
    expect(onChoose).not.toHaveBeenCalled()
  })

  it('shows a chosen provider failure without silently using smart routing', async () => {
    chooseSwapQuote.mockRejectedValue(new Error('Selected offer changed'))
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select Solver a' }))
    await screen.findByText('Selected offer changed')
    expect(onChoose).not.toHaveBeenCalled()
    expect(onSmartRouting).not.toHaveBeenCalled()
  })
})
