import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Init from '../../screens/Init/Init'
import { AspContext } from '../../providers/asp'
import { FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { DevModeProvider } from '../../providers/devMode'
import { mockAspContextValue, mockFlowContextValue, mockNavigationContextValue, mockWalletContextValue } from './mocks'
import { createPasskeyWallet, loginWithPasskey } from '../../lib/passkey'

vi.mock('../../lib/passkey', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/passkey')>()),
  createPasskeyWallet: vi.fn(),
  loginWithPasskey: vi.fn(),
}))

function withContexts(children: React.ReactNode) {
  return (
    <AspContext.Provider value={mockAspContextValue as any}>
      <NavigationContext.Provider value={mockNavigationContextValue as any}>
        <FlowContext.Provider value={mockFlowContextValue as any}>
          <WalletContext.Provider value={mockWalletContextValue as any}>{children}</WalletContext.Provider>
        </FlowContext.Provider>
      </NavigationContext.Provider>
    </AspContext.Provider>
  )
}

// Uses the real DevModeProvider so the triple-tap gesture actually toggles devMode.
function renderInitWithProvider() {
  return render(<DevModeProvider>{withContexts(<Init />)}</DevModeProvider>)
}

describe('Init screen — devMode triple-tap gesture (pristine wallet)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('enables devMode by triple-tapping the logo, then exposes the rotation toggle', async () => {
    renderInitWithProvider()

    // devMode starts off: creating a wallet skips the options sheet
    fireEvent.click(screen.getByText('+ Create wallet'))
    expect(screen.queryByTestId('toggle-hd-rotation')).not.toBeInTheDocument()

    // Three taps on the welcome heading toggle devMode on
    const heading = screen.getByTestId('onboarding-devmode-tap')
    fireEvent.click(heading)
    fireEvent.click(heading)
    fireEvent.click(heading)

    // Now "+ Create wallet" opens the advanced sheet with the rotation toggle
    fireEvent.click(screen.getByText('+ Create wallet'))
    expect(await screen.findByTestId('toggle-hd-rotation')).toBeInTheDocument()
  })
})

describe('Init screen — passkey wallets', () => {
  const words = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  function renderWithSpies() {
    const navigate = vi.fn()
    const setInitInfo = vi.fn()
    const updateWallet = vi.fn()
    render(
      <DevModeProvider>
        <AspContext.Provider value={mockAspContextValue as any}>
          <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, setInitInfo } as any}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, updateWallet } as any}>
                <Init />
              </WalletContext.Provider>
            </FlowContext.Provider>
          </NavigationContext.Provider>
        </AspContext.Provider>
      </DevModeProvider>,
    )
    return { navigate, setInitInfo, updateWallet }
  }

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'credentials', { value: {}, configurable: true })
  })

  const startPasskeyWallet = async () => {
    fireEvent.click(screen.getByText('Create with passkey'))
    expect(await screen.findByText(/press Cancel/)).toBeInTheDocument()
    expect(createPasskeyWallet).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Create passkey' }))
  }

  it('explains the prompts first, then creates a wallet whose words come from the new passkey', async () => {
    vi.mocked(createPasskeyWallet).mockResolvedValue({
      prf: true,
      mnemonic: words,
      passkeyId: 'ab',
      passkeyRpId: 'localhost',
      passkeyName: 'Arkade wallet · ab12cd34',
    })
    const { navigate, setInitInfo, updateWallet } = renderWithSpies()
    await startPasskeyWallet()
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.InitConnect))
    expect(updateWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        passkeyPrf: true,
        passkeyId: 'ab',
        passkeyRpId: 'localhost',
        lockedByBiometrics: false,
      }),
    )
    expect(setInitInfo).toHaveBeenCalledWith(
      expect.objectContaining({ mnemonic: words, passkeyPrf: true, restoring: false }),
    )
    expect(setInitInfo.mock.calls.at(-1)?.[0]).not.toHaveProperty('password')
  })

  const fallback = {
    prf: false as const,
    mnemonic: words,
    password: 'cafe',
    passkeyId: 'ab',
    passkeyRpId: 'localhost',
    passkeyName: 'Arkade wallet · ab12cd34',
  }

  it('asks before falling back when the passkey cannot derive the wallet keys', async () => {
    vi.mocked(createPasskeyWallet).mockResolvedValue(fallback)
    const { navigate, setInitInfo, updateWallet } = renderWithSpies()
    await startPasskeyWallet()
    expect(await screen.findByText(/stays on this device/)).toBeInTheDocument()
    expect(screen.getByText(/not software running as you/)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(updateWallet).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with this passkey' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.InitConnect))
    expect(updateWallet).toHaveBeenCalledWith(
      expect.objectContaining({ lockedByBiometrics: true, passkeyId: 'ab', passkeyRpId: 'localhost' }),
    )
    expect(setInitInfo).toHaveBeenCalledWith(
      expect.objectContaining({ mnemonic: words, password: 'cafe', restoring: false }),
    )
  })

  it('creates nothing when the fallback is declined, and names the passkey left behind', async () => {
    vi.mocked(createPasskeyWallet).mockResolvedValue(fallback)
    const { navigate, updateWallet } = renderWithSpies()
    await startPasskeyWallet()
    await screen.findByText(/stays on this device/)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText(/Arkade wallet · ab12cd34/)).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(updateWallet).not.toHaveBeenCalled()
  })

  it('logs in on a new device from a passkey alone', async () => {
    vi.mocked(loginWithPasskey).mockResolvedValue({ mnemonic: words, passkeyId: 'cd', passkeyRpId: 'localhost' })
    const { navigate, setInitInfo, updateWallet } = renderWithSpies()
    fireEvent.click(screen.getAllByText('Other login options')[0])
    fireEvent.click(await screen.findByText('Log in with passkey'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.InitConnect))
    expect(updateWallet).toHaveBeenCalledWith(expect.objectContaining({ passkeyPrf: true, passkeyId: 'cd' }))
    expect(setInitInfo).toHaveBeenCalledWith(
      expect.objectContaining({ mnemonic: words, passkeyPrf: true, restoring: true }),
    )
  })
})
