import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import Init from '../../screens/Init/Init'
import { AspContext } from '../../providers/asp'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { DevModeContext, DevModeProvider } from '../../providers/devMode'
import {
  mockAspContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
  mockDevModeContextValue,
} from './mocks'

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

function renderInit(devMode: boolean) {
  return render(
    <DevModeContext.Provider value={{ ...mockDevModeContextValue, devMode }}>
      {withContexts(<Init />)}
    </DevModeContext.Provider>,
  )
}

// Uses the real DevModeProvider so the triple-tap gesture actually toggles devMode.
function renderInitWithProvider() {
  return render(<DevModeProvider>{withContexts(<Init />)}</DevModeProvider>)
}

describe('Init screen — rotation toggle gating', () => {
  it('does not show the rotation toggle when dev mode is off', () => {
    renderInit(false)
    fireEvent.click(screen.getByText('+ Create wallet'))
    expect(screen.queryByTestId('toggle-hd-rotation')).not.toBeInTheDocument()
  })

  it('shows the rotation toggle in the create-options sheet when dev mode is on', async () => {
    renderInit(true)
    fireEvent.click(screen.getByText('+ Create wallet'))
    expect(await screen.findByTestId('toggle-hd-rotation')).toBeInTheDocument()
  })
})

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
