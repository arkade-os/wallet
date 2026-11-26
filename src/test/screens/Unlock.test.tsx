import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PasskeyCancelled } from '@arkade-os/sdk'
import Unlock from '../../screens/Wallet/Unlock'
import { NavigationContext } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'
import { DevModeContext } from '../../providers/devMode'
import {
  mockNavigationContextValue,
  mockFlowContextValue,
  mockWalletContextValue,
  mockDevModeContextValue,
} from './mocks'

function renderUnlock(wallet: Record<string, unknown>, unlockWithPasskey = vi.fn(() => Promise.resolve())) {
  const unlockWallet = vi.fn(() => Promise.resolve())
  render(
    <DevModeContext.Provider value={mockDevModeContextValue}>
      <NavigationContext.Provider value={mockNavigationContextValue as any}>
        <FlowContext.Provider value={mockFlowContextValue as any}>
          <WalletContext.Provider
            value={
              {
                ...mockWalletContextValue,
                wallet: { ...mockWalletContextValue.wallet, ...wallet },
                unlockWallet,
                unlockWithPasskey,
              } as any
            }
          >
            <Unlock />
          </WalletContext.Provider>
        </FlowContext.Provider>
      </NavigationContext.Provider>
    </DevModeContext.Provider>,
  )
  return { unlockWallet, unlockWithPasskey }
}

describe('Unlock screen — passkey wallets', () => {
  it('unlocks a passkey-derived wallet with its passkey, never asking for a password', async () => {
    const { unlockWallet, unlockWithPasskey } = renderUnlock({ passkeyPrf: true, passkeyId: 'ab' })
    expect(screen.queryByTestId('password')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Unlock wallet' }))
    await waitFor(() => expect(unlockWithPasskey).toHaveBeenCalled())
    expect(unlockWallet).not.toHaveBeenCalled()
  })

  it('tells the user when the passkey unlock fails', async () => {
    const { unlockWithPasskey } = renderUnlock(
      { passkeyPrf: true, passkeyId: 'ab' },
      vi.fn(() => Promise.reject(new Error('authenticator unavailable'))),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Unlock wallet' }))
    await waitFor(() => expect(unlockWithPasskey).toHaveBeenCalled())

    expect(await screen.findByTestId('error-message')).toHaveTextContent("Couldn't unlock with that passkey")
  })

  it('does not retry the passkey when the user taps its error', async () => {
    const { unlockWithPasskey } = renderUnlock(
      { passkeyPrf: true, passkeyId: 'ab' },
      vi.fn(() => Promise.reject(new Error('authenticator unavailable'))),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Unlock wallet' }))
    fireEvent.click(await screen.findByTestId('error-message'))

    expect(unlockWithPasskey).toHaveBeenCalledTimes(1)
  })

  it('says nothing when the user dismisses the passkey prompt', async () => {
    const { unlockWithPasskey } = renderUnlock(
      { passkeyPrf: true, passkeyId: 'ab' },
      vi.fn(() => Promise.reject(new PasskeyCancelled())),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Unlock wallet' }))
    await waitFor(() => expect(unlockWithPasskey).toHaveBeenCalled())

    expect(await screen.findByRole('button', { name: 'Unlock wallet' })).toBeInTheDocument()
    expect(screen.queryByTestId('error-message')).toBeNull()
  })
})
