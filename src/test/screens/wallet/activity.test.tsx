import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Activity from '../../../screens/Wallet/Activity'
import { WalletContext } from '../../../providers/wallet'
import { mockWalletContextValue } from '../mocks'

vi.mock('../../../components/TransactionsList', () => ({
  default: ({ typeFilter }: { typeFilter?: string }) => <div data-testid='activity-results'>{typeFilter ?? 'all'}</div>,
  shouldHideDevAssetTx: (tx: { roundTxid?: string }) => tx.roundTxid === 'hidden-swap',
}))

const ordinaryTx = { ...mockWalletContextValue.txs[0], type: 'received' }
const swapTx = { ...ordinaryTx, roundTxid: 'swap-tx', type: 'swap' }

describe('Activity screen', () => {
  it('defaults to All and filters to every swap status through the shared swap type', async () => {
    render(
      <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [ordinaryTx, swapTx] } as any}>
        <Activity />
      </WalletContext.Provider>,
    )

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('activity-results')).toHaveTextContent('all')

    await userEvent.click(screen.getByRole('button', { name: 'Swaps' }))

    expect(screen.getByRole('button', { name: 'Swaps' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(screen.getByTestId('activity-results')).toHaveTextContent('swap'))
  })

  it('hides the filter when there is no swap activity', () => {
    render(
      <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [ordinaryTx] } as any}>
        <Activity />
      </WalletContext.Provider>,
    )

    expect(screen.queryByRole('group', { name: 'Filter activity' })).not.toBeInTheDocument()
    expect(screen.getByTestId('activity-results')).toHaveTextContent('all')
  })

  it('resets to All when the remaining swap is hidden from the transaction list', async () => {
    const { rerender } = render(
      <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [ordinaryTx, swapTx] } as any}>
        <Activity />
      </WalletContext.Provider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Swaps' }))

    rerender(
      <WalletContext.Provider
        value={{ ...mockWalletContextValue, txs: [ordinaryTx, { ...swapTx, roundTxid: 'hidden-swap' }] } as any}
      >
        <Activity />
      </WalletContext.Provider>,
    )

    expect(screen.queryByRole('group', { name: 'Filter activity' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('activity-results')).toHaveTextContent('all'))
  })
})
