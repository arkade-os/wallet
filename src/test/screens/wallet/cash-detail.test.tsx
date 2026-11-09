import { useContext, useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CashDetail from '../../../screens/Wallet/Cash/Detail'
import { CashContext, CashProvider } from '../../../providers/cash'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import type { CashRecord } from '../../../lib/arkadeCashTransfer'
import { mockNavigationContextValue, mockWalletContextValue } from '../mocks'

const record: CashRecord = {
  id: 'voucher-1',
  action: 'issued',
  amount: 5_000,
  outcome: 'issued',
  status: 'available',
  token: 'arkadecash1token',
  issueTxIds: ['aa'.repeat(32)],
  claimTxIds: [],
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_000,
}

/** Stands in for Send/Inventory: selects the voucher the way they do. */
function SelectVoucher({ id }: { id: string }) {
  const { setVoucher } = useContext(CashContext)
  useEffect(() => setVoucher(id), [id])
  return null
}

const tree = (cashRecords: CashRecord[], wallet: Record<string, unknown> = {}) => (
  <NavigationContext.Provider value={mockNavigationContextValue as never}>
    <WalletContext.Provider value={{ ...mockWalletContextValue, cashRecords, ...wallet } as never}>
      <CashProvider>
        <SelectVoucher id='voucher-1' />
        <CashDetail />
      </CashProvider>
    </WalletContext.Provider>
  </NavigationContext.Provider>
)

describe('Cash detail', () => {
  it('shows the voucher that lands after the selection instead of "not found"', async () => {
    // Issue finishes before the new record has reached the list render.
    const { rerender } = render(tree([]))
    expect(screen.queryByText('Voucher not found')).toBeNull()

    rerender(tree([record]))
    await waitFor(() => expect(screen.getByText('5,000 sats')).toBeTruthy())
    expect(screen.queryByText('Voucher not found')).toBeNull()
  })

  it('shows the QR, copy and share controls alongside a self-claim action', async () => {
    render(tree([record]))

    await waitFor(() => expect(screen.getByText('5,000 sats')).toBeTruthy())
    expect(screen.getByRole('img', { name: 'Voucher QR code' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Share' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Claim to this wallet' })).toBeTruthy()
  })

  it('claims an issued voucher to this wallet', async () => {
    const claimCash = vi.fn(async () => ({
      record: { ...record, action: 'claimed', outcome: 'claimed', status: 'claimed', token: undefined },
      swept: record.amount,
      recovering: 0,
    }))
    render(tree([record], { claimCash }))

    fireEvent.click(await screen.findByRole('button', { name: 'Claim to this wallet' }))
    await waitFor(() => expect(claimCash).toHaveBeenCalledWith(record.token))
  })

  it('shows a claimed voucher without exposing the QR or claim action', async () => {
    render(tree([{ ...record, status: 'claimed', outcome: 'claimed' }]))

    await waitFor(() => expect(screen.getAllByText('Claimed').length).toBeGreaterThan(0))
    expect(screen.queryByRole('img', { name: 'Voucher QR code' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Claim to this wallet' })).toBeNull()
    expect(screen.getByText('This voucher has been claimed and can no longer be shared.')).toBeTruthy()
  })

  it('refreshes voucher status when the page regains focus', async () => {
    const refreshCash = vi.fn(async () => [record])
    render(tree([record], { refreshCash }))

    await waitFor(() => expect(refreshCash).toHaveBeenCalled())
    refreshCash.mockClear()
    fireEvent.focus(window)
    await waitFor(() => expect(refreshCash).toHaveBeenCalledTimes(1))
  })

  it('refreshes voucher status from a pull gesture', async () => {
    const refreshCash = vi.fn(async () => [record])
    const { container } = render(tree([record], { refreshCash }))

    await waitFor(() => expect(refreshCash).toHaveBeenCalled())
    refreshCash.mockClear()
    const content = container.querySelector('.content') as HTMLElement
    fireEvent.touchStart(content, { touches: [{ clientY: 100 }] })
    fireEvent.touchMove(content, { touches: [{ clientY: 240 }] })
    fireEvent.touchEnd(content)
    await waitFor(() => expect(refreshCash).toHaveBeenCalledTimes(1))
  })
})
