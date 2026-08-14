import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InitConnect from '../../screens/Init/Connect'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { mockFlowContextValue, mockNavigationContextValue, mockWalletContextValue } from './mocks'

vi.mock('../../lib/mnemonic', () => ({
  setMnemonic: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../lib/privateKey', () => ({
  setPrivateKey: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../components/LoadingLogo', () => ({
  default: ({ text, done, onExitComplete }: { text?: string; done?: boolean; onExitComplete?: () => void }) => (
    <button data-testid='loading-logo' data-done={String(Boolean(done))} onClick={() => onExitComplete?.()}>
      {text}
    </button>
  ),
}))

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

function renderConnect({ restoring = false }: { restoring?: boolean } = {}) {
  const initWallet = vi.fn().mockResolvedValue(undefined)
  const navigate = vi.fn()
  const setInitInfo = vi.fn()
  const initInfo = { password: 'password', mnemonic: MNEMONIC, restoring }

  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
      <FlowContext.Provider value={{ ...mockFlowContextValue, initInfo, setInitInfo } as any}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, initWallet } as any}>
          <InitConnect />
        </WalletContext.Provider>
      </FlowContext.Provider>
    </NavigationContext.Provider>,
  )

  return { initWallet, navigate, setInitInfo }
}

/**
 * Regression cover for the wallet-creation hang (#881). That bug was this
 * screen waiting on a swap client that might never arrive; with the swap
 * provider gone there is nothing left to wait on, so the guarantee is simply
 * that initialising the wallet always finishes the screen — which is what the
 * original fix was really protecting.
 */
describe('InitConnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finishes new wallet creation', async () => {
    const { initWallet } = renderConnect({ restoring: false })

    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: MNEMONIC, walletMode: undefined, restoring: false }),
    )
    await waitFor(() => expect(screen.getByTestId('loading-logo')).toHaveAttribute('data-done', 'true'))
  })

  it('finishes a restore too, with nothing left to wait on', async () => {
    const { initWallet } = renderConnect({ restoring: true })

    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: MNEMONIC, walletMode: undefined, restoring: true }),
    )
    await waitFor(() => expect(screen.getByTestId('loading-logo')).toHaveAttribute('data-done', 'true'))
  })
})
