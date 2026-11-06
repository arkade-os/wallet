import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Reset from '../../../screens/Settings/Reset'
import { WalletContext } from '../../../providers/wallet'

if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', {
    writable: true,
    configurable: true,
    value: MouseEvent,
  })
}

const renderReset = (resetWallet: () => Promise<void>) => {
  render(
    <WalletContext.Provider value={{ resetWallet } as any}>
      <Reset />
    </WalletContext.Provider>,
  )
  fireEvent.click(screen.getByRole('checkbox'))
  return screen.getByRole('button', { name: 'Reset wallet' })
}

describe('Reset screen', () => {
  it('shows the failure and keeps the button usable when the reset rejects', async () => {
    const resetWallet = vi.fn().mockRejectedValue(new Error('indexeddb unavailable'))

    const button = renderReset(resetWallet)
    fireEvent.click(button)

    await vi.waitFor(() => expect(screen.getByTestId('error-message')).toBeInTheDocument())
    expect(screen.getByTestId('error-message')).toHaveTextContent('Could not reset the wallet')
    expect(screen.getByTestId('error-message')).not.toHaveTextContent('indexeddb unavailable')
    expect(button).not.toBeDisabled()
  })

  it('shows no failure before a reset is attempted', () => {
    renderReset(vi.fn().mockResolvedValue(undefined))

    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  })
})
