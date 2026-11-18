import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Init from '../../screens/Init/Init'
import { AspContext } from '../../providers/asp'
import { FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { DevModeProvider } from '../../providers/devMode'
import { mockAspContextValue, mockFlowContextValue, mockNavigationContextValue, mockWalletContextValue } from './mocks'

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

  it('enables devMode by triple-tapping the heading, then exposes the rotation toggle', async () => {
    renderInitWithProvider()

    // devMode starts off: creating a wallet skips the options sheet
    fireEvent.click(screen.getByTestId('onboarding-create'))
    expect(screen.queryByTestId('toggle-hd-rotation')).not.toBeInTheDocument()

    // Three taps on the heading toggle devMode on
    const heading = screen.getByTestId('onboarding-devmode-tap')
    fireEvent.click(heading)
    fireEvent.click(heading)
    fireEvent.click(heading)

    // Now creating opens the advanced sheet with the rotation toggle
    fireEvent.click(screen.getByTestId('onboarding-create'))
    expect(await screen.findByTestId('toggle-hd-rotation')).toBeInTheDocument()
  })
})

describe('Init screen — the two ways in', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const renderInit = (asp = mockAspContextValue, navigate = vi.fn()) => {
    render(
      <DevModeProvider>
        <AspContext.Provider value={asp as any}>
          <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate } as any}>
            <FlowContext.Provider value={mockFlowContextValue as any}>
              <WalletContext.Provider value={mockWalletContextValue as any}>
                <Init />
              </WalletContext.Provider>
            </FlowContext.Provider>
          </NavigationContext.Provider>
        </AspContext.Provider>
      </DevModeProvider>,
    )
    return navigate
  }

  it('says what the screen is for and what each choice needs', () => {
    renderInit()

    expect(screen.getByRole('heading', { name: 'Set up your wallet' })).toBeInTheDocument()
    const create = screen.getByRole('button', { name: /Create a new wallet/ })
    const restore = screen.getByRole('button', { name: /Restore a wallet/ })
    expect(create).toHaveTextContent('No account needed')
    expect(restore).toHaveTextContent('With your recovery phrase or private key')
    // No selling points and no emoji in the way of the two choices.
    expect(screen.queryByText(/and more/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('👾')
  })

  it('creates a wallet in one tap', () => {
    const navigate = renderInit()
    fireEvent.click(screen.getByTestId('onboarding-create'))
    expect(navigate).toHaveBeenCalledWith(Pages.InitConnect)
  })

  // Restore used to sit behind an "Other login options" sheet that held nothing else.
  it('opens Restore straight from the screen', () => {
    const navigate = renderInit()
    expect(screen.queryByText('Other login options')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('onboarding-restore'))
    expect(navigate).toHaveBeenCalledWith(Pages.InitRestore)
  })

  it('holds both choices and says why while the Arkade server cannot be reached', () => {
    const navigate = renderInit({
      ...mockAspContextValue,
      aspInfo: { ...mockAspContextValue.aspInfo, unreachable: true },
    } as typeof mockAspContextValue)

    expect(screen.getByTestId('onboarding-create')).toBeDisabled()
    expect(screen.getByTestId('onboarding-restore')).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Arkade server unreachable')
    fireEvent.click(screen.getByTestId('onboarding-create'))
    expect(navigate).not.toHaveBeenCalled()
  })
})
