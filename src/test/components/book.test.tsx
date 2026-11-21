import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BookLadder from '../../components/BookLadder'
import TradeSheet from '../../components/TradeSheet'
import { buildBook, type BookOrder } from '../../lib/book'

vi.mock('../../components/SheetModal', () => ({
  default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}))

const ASSET = 'cd'.repeat(32) + '0000'

const order = (over: Partial<BookOrder> = {}): BookOrder => ({
  id: 'ask-1',
  fundingTxid: 'aa'.repeat(32),
  vout: 0,
  offerHex: '00',
  swapPkScript: '51',
  give: { assetId: ASSET, amount: 100n },
  want: { assetId: 'btc', amount: 5_000n },
  makerPkScript: '22',
  depositSats: 330n,
  createdAt: 1,
  ...over,
})

describe('order book screen', () => {
  it('shows asks above bids and cancels only a row of ours', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSelect = vi.fn()
    const book = buildBook(
      [
        order(),
        order({
          id: 'bid-1',
          give: { assetId: 'btc', amount: 4_000n },
          want: { assetId: ASSET, amount: 100n },
          makerPkScript: 'mine',
        }),
      ],
      `${ASSET}/btc`,
      new Set(['mine']),
    )

    render(<BookLadder book={book} decimals={0} onCancel={onCancel} onSelect={onSelect} />)

    const rows = screen.getAllByTestId(/^book-row-/)
    expect(rows.map((row) => row.getAttribute('data-testid'))).toEqual(['book-row-ask-1', 'book-row-bid-1'])
    expect(screen.getByText('Asks')).toBeInTheDocument()
    expect(screen.getByText(/Yours/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'bid-1' }))
  })

  it('says a matching buy fills now, and a different size waits', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const book = buildBook([order()], `${ASSET}/btc`, new Set())

    const { rerender } = render(
      <TradeSheet
        open
        ticker='SEED'
        decimals={0}
        book={book}
        takeable
        sats={20_000}
        assetAtoms={0n}
        prefill={{ side: 'buy', baseAtoms: 100n, quoteAtoms: 5_000n }}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByTestId('book-outlook')).toHaveTextContent('Fills now')
    await user.click(screen.getByTestId('book-submit'))
    expect(onSubmit).toHaveBeenCalledWith({
      give: { assetId: 'btc', amount: 5_000n },
      want: { assetId: ASSET, amount: 100n },
    })

    rerender(
      <TradeSheet
        open
        ticker='SEED'
        decimals={0}
        book={book}
        takeable
        sats={20_000}
        assetAtoms={0n}
        prefill={{ side: 'buy', baseAtoms: 40n, quoteAtoms: 9_000n }}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByTestId('book-outlook')).toHaveTextContent('Waits. A fill takes the whole order.')
  })

  it('does not promise a fill when no emulator can submit one', () => {
    const book = buildBook([order()], `${ASSET}/btc`, new Set())
    render(
      <TradeSheet
        open
        ticker='SEED'
        decimals={0}
        book={book}
        takeable={false}
        sats={20_000}
        assetAtoms={0n}
        prefill={{ side: 'buy', baseAtoms: 100n, quoteAtoms: 5_000n }}
        onClose={() => {}}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByTestId('book-outlook')).toHaveTextContent('Waits until someone sells at this price')
    expect(screen.getByText(/emulator/)).toBeInTheDocument()
  })
})
