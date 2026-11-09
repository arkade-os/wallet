import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ClaimCash from '../../../screens/Wallet/Cash/Claim'
import { CashContext } from '../../../providers/cash'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { ToastProvider } from '../../../components/Toast'
import { mockNavigationContextValue, mockWalletContextValue } from '../mocks'

vi.mock('../../../lib/arkadeCash', () => ({
  decodeCashInput: (input: string) => ({ toString: () => input.replace(/^web\+arkade:\/\//, '') }),
}))
// Drive the scanner without a camera.
vi.mock('../../../components/Scanner', () => ({
  default: ({ onData }: { onData: (v: string) => void }) => (
    <button onClick={() => onData('arkadecash1scannedtoken')}>scan-result</button>
  ),
}))
vi.mock('../../../lib/arkadeCashNfc', () => ({ nfcSupported: () => false, readCashFromNfc: vi.fn() }))

const renderClaim = (overrides: { claimCash?: unknown; navigate?: (p: string) => void } = {}) => {
  const cash = { setVoucher: vi.fn(), clearVoucher: vi.fn(), pendingToken: {} as { current?: string }, voucherId: '' }
  const navigate = overrides.navigate ?? vi.fn()
  render(
    <ToastProvider>
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as never}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, claimCash: overrides.claimCash } as never}>
          <CashContext.Provider value={cash as never}>
            <ClaimCash />
          </CashContext.Provider>
        </WalletContext.Provider>
      </NavigationContext.Provider>
    </ToastProvider>,
  )
  const input = () => screen.getByLabelText('Voucher code') as HTMLInputElement
  return { cash, navigate, input }
}

describe('Claim voucher screen', () => {
  it('offers a pasteable, scannable field instead of a bare button', () => {
    const { input } = renderClaim()
    // the shared destination input: named field, clipboard dock, and camera dock
    expect(input().name).toBe('voucher-code')
    expect(screen.getByLabelText('Paste')).toBeTruthy()
    expect(screen.getByLabelText('Scan QR')).toBeTruthy()
  })

  it('flags a value that is not a voucher before claiming', async () => {
    const claimCash = vi.fn()
    const { input } = renderClaim({ claimCash })
    fireEvent.change(input(), { target: { value: 'bc1qnotavoucher' } })
    await waitFor(() => expect(screen.getByText('This does not look like a voucher code')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Claim voucher' })).toBeDisabled()
    expect(claimCash).not.toHaveBeenCalled()
  })

  it('claims a pasted voucher and opens its detail', async () => {
    const claimCash = vi.fn(async () => ({ record: { id: 'voucher-9' } }))
    const { cash, navigate, input } = renderClaim({ claimCash })
    fireEvent.change(input(), { target: { value: 'web+arkade://arkadecash1pastedtoken' } })

    fireEvent.click(screen.getByRole('button', { name: 'Claim voucher' }))
    await waitFor(() => expect(claimCash).toHaveBeenCalledWith('arkadecash1pastedtoken'))
    expect(cash.setVoucher).toHaveBeenCalledWith('voucher-9')
    expect(navigate).toHaveBeenCalledWith(Pages.CashDetail)
  })

  it('claims straight after a scan', async () => {
    const claimCash = vi.fn(async () => ({ record: { id: 'voucher-9' } }))
    const { navigate } = renderClaim({ claimCash })
    fireEvent.click(screen.getByLabelText('Scan QR'))
    fireEvent.click(screen.getByText('scan-result'))
    await waitFor(() => expect(claimCash).toHaveBeenCalledWith('arkadecash1scannedtoken'))
    expect(navigate).toHaveBeenCalledWith(Pages.CashDetail)
  })
})
