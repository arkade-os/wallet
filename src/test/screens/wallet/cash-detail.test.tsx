import { useContext, useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

const tree = (cashRecords: CashRecord[]) => (
  <NavigationContext.Provider value={mockNavigationContextValue as never}>
    <WalletContext.Provider value={{ ...mockWalletContextValue, cashRecords } as never}>
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
})
