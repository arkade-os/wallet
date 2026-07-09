import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the WebAuthn layer so we can drive the onboarding/unlock wiring without
// a real authenticator (the crypto round-trip itself is proven in-browser e2e).
vi.mock('../../lib/passkey', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  registerPasskey: vi.fn(),
  PrfUnavailableError: class PrfUnavailableError extends Error {},
}))
vi.mock('../../lib/passkeyVault', () => ({
  hasPasskeyWallet: vi.fn(() => false),
  // derive a deterministic 12-word mnemonic from the PRF output in tests
  mnemonicFromPrf: vi.fn(
    async () => 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  ),
}))

import Init from '../../screens/Init/Init'
import Unlock from '../../screens/Wallet/Unlock'
import { AspContext } from '../../providers/asp'
import { FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { DevModeProvider } from '../../providers/devMode'
import { registerPasskey } from '../../lib/passkey'
import { hasPasskeyWallet } from '../../lib/passkeyVault'
import { mockAspContextValue, mockFlowContextValue, mockNavigationContextValue, mockWalletContextValue } from './mocks'

const registerPasskeyMock = vi.mocked(registerPasskey)
const hasPasskeyWalletMock = vi.mocked(hasPasskeyWallet)

describe('onboarding — passkey registration wiring', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const renderInit = (overrides: { setInitInfo?: any; navigate?: any } = {}) => {
    const setInitInfo = overrides.setInitInfo ?? vi.fn()
    const navigate = overrides.navigate ?? vi.fn()
    render(
      <DevModeProvider>
        <AspContext.Provider value={mockAspContextValue as any}>
          <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, setInitInfo } as any}>
              <WalletContext.Provider value={mockWalletContextValue as any}>
                <Init />
              </WalletContext.Provider>
            </FlowContext.Provider>
          </NavigationContext.Provider>
        </AspContext.Provider>
      </DevModeProvider>,
    )
    return { setInitInfo, navigate }
  }

  it('derives the mnemonic from the passkey PRF and routes to Connect with the credential id', async () => {
    registerPasskeyMock.mockResolvedValue({
      kind: 'prf',
      credentialId: 'abcd',
      prfOutput: new Uint8Array(32).fill(9),
    })
    const { setInitInfo, navigate } = renderInit()

    fireEvent.click(screen.getByText('+ Create wallet'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.InitConnect))
    const info = setInitInfo.mock.calls.at(-1)[0]
    expect(info.passkeyCredentialId).toBe('abcd')
    expect(info.mnemonic.split(' ').length).toBe(12) // derived from PRF, not stored
    expect(info.password).toBeUndefined()
  })

  it('falls back to the legacy passkey scheme when PRF is unavailable', async () => {
    registerPasskeyMock.mockResolvedValue({ kind: 'legacy', credentialId: 'ef01', legacySecret: 'deadbeef' })
    const { setInitInfo, navigate } = renderInit()

    fireEvent.click(screen.getByText('+ Create wallet'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.InitConnect))
    const info = setInitInfo.mock.calls.at(-1)[0]
    expect(info.legacyPasskey).toEqual({ credentialId: 'ef01' })
    expect(info.password).toBe('deadbeef')
    expect(info.passkeyCredentialId).toBeUndefined()
  })

  it('offers a passwordless fallback sheet when the passkey ceremony fails', async () => {
    registerPasskeyMock.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'))
    const { navigate } = renderInit()

    fireEvent.click(screen.getByText('+ Create wallet'))

    expect(await screen.findByText('Continue without passkey')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalledWith(Pages.InitConnect)
  })
})

describe('unlock — passkey screen wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderUnlock = (unlockWalletWithPasskey: any, navigate = vi.fn()) => {
    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, unlockWalletWithPasskey } as any}>
          <Unlock />
        </WalletContext.Provider>
      </NavigationContext.Provider>,
    )
    return { navigate }
  }

  it('renders the passkey unlock and navigates home on success', async () => {
    hasPasskeyWalletMock.mockReturnValue(true)
    const unlockWalletWithPasskey = vi.fn().mockResolvedValue(undefined)
    const { navigate } = renderUnlock(unlockWalletWithPasskey)

    expect(screen.getByText('Unlock with your passkey')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Unlock wallet'))

    await waitFor(() => expect(unlockWalletWithPasskey).toHaveBeenCalled())
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(Pages.Wallet))
  })

  it('surfaces a legible message when the passkey cannot open the vault', async () => {
    hasPasskeyWalletMock.mockReturnValue(true)
    const unlockWalletWithPasskey = vi.fn().mockRejectedValue(new DOMException('', 'OperationError'))
    renderUnlock(unlockWalletWithPasskey)

    fireEvent.click(screen.getByText('Unlock wallet'))

    expect(await screen.findByText(/didn't produce the right key/i)).toBeInTheDocument()
  })
})
