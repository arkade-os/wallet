import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Connect from '../../screens/Init/Connect'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { WalletContext } from '../../providers/wallet'
import { DevModeContext } from '../../providers/devMode'
import {
  mockNavigationContextValue,
  mockFlowContextValue,
  mockWalletContextValue,
  mockDevModeContextValue,
} from './mocks'

// Encrypting the secret is not what is under test, and is slow in jsdom.
vi.mock('../../lib/privateKey', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/privateKey')>()),
  setPrivateKey: vi.fn(() => Promise.resolve()),
}))
vi.mock('../../lib/mnemonic', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/mnemonic')>()),
  setMnemonic: vi.fn(() => Promise.resolve()),
}))

const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const privateKey = new Uint8Array(32).fill(0xaa)

function renderConnect(
  initInfo: Record<string, unknown>,
  initWallet = vi.fn(() => Promise.resolve()),
  navigate = vi.fn(),
) {
  render(
    <DevModeContext.Provider value={mockDevModeContextValue}>
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
        <FlowContext.Provider value={{ ...mockFlowContextValue, initInfo } as any}>
          <WalletContext.Provider value={{ ...mockWalletContextValue, initWallet } as any}>
            <Connect />
          </WalletContext.Provider>
        </FlowContext.Provider>
      </NavigationContext.Provider>
    </DevModeContext.Provider>,
  )
  return { initWallet, navigate }
}

// The private-key branch used to drop `restoring`, so an nsec restore skipped
// `wallet.restore()` and the swap rebuild read an incomplete history.
describe('Connect screen — restoring flag', () => {
  it('passes restoring through for a private key', async () => {
    const { initWallet } = renderConnect({ privateKey, password: 'pw', restoring: true })
    await waitFor(() => expect(initWallet).toHaveBeenCalledWith({ privateKey, restoring: true }))
  })

  it('passes restoring through for a mnemonic', async () => {
    const { initWallet } = renderConnect({
      mnemonic: validMnemonic,
      password: 'pw',
      restoring: true,
      walletMode: 'static',
    })
    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: validMnemonic, walletMode: 'static', restoring: true }),
    )
  })

  it('does not restore a newly created wallet', async () => {
    const { initWallet } = renderConnect({
      mnemonic: validMnemonic,
      password: 'pw',
      restoring: false,
      walletMode: 'static',
    })
    await waitFor(() =>
      expect(initWallet).toHaveBeenCalledWith({ mnemonic: validMnemonic, walletMode: 'static', restoring: false }),
    )
  })

  it('shows that Electrum is offline and stays on this screen', async () => {
    const initWallet = vi.fn(() => Promise.reject(new Error('INIT_WALLET failed: Electrum is offline')))
    const { navigate } = renderConnect({ privateKey, password: 'pw', restoring: true }, initWallet)
    expect(await screen.findByTestId('error-message')).toHaveTextContent('Electrum is offline')
    expect(navigate).not.toHaveBeenCalledWith(Pages.Init)
  })
})
