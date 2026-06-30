import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Restore from '../../screens/Init/Restore'
import { ConfigContext } from '../../providers/config'
import { NavigationContext } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import { AspContext } from '../../providers/asp'
import { DevModeContext } from '../../providers/devMode'
import {
  mockConfigContextValue,
  mockNavigationContextValue,
  mockFlowContextValue,
  mockAspContextValue,
  mockDevModeContextValue,
} from './mocks'

const validMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const privateKeyHex = 'aa'.repeat(32)

function renderRestore(devMode: boolean) {
  return render(
    <DevModeContext.Provider value={{ ...mockDevModeContextValue, devMode }}>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <AspContext.Provider value={mockAspContextValue as any}>
          <NavigationContext.Provider value={mockNavigationContextValue as any}>
            <FlowContext.Provider value={mockFlowContextValue as any}>
              <Restore />
            </FlowContext.Provider>
          </NavigationContext.Provider>
        </AspContext.Provider>
      </ConfigContext.Provider>
    </DevModeContext.Provider>,
  )
}

const typeKey = (value: string) => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } })
}

describe('Restore screen — rotation control gating', () => {
  it('does not show the rotation control when dev mode is off, even for a valid mnemonic', async () => {
    renderRestore(false)
    typeKey(validMnemonic)
    // give the detection effect a chance to run
    expect(await screen.findByText(/Do not\s+share it with anyone\./)).toBeInTheDocument()
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })

  it('shows the rotation control when dev mode is on and a valid mnemonic is detected', async () => {
    renderRestore(true)
    typeKey(validMnemonic)
    expect(await screen.findByText('Address rotation')).toBeInTheDocument()
    expect(screen.getByText('Inherit')).toBeInTheDocument()
  })

  it('does not show the rotation control for a private key, even in dev mode', async () => {
    renderRestore(true)
    typeKey(privateKeyHex)
    expect(await screen.findByText(/Do not\s+share it with anyone\./)).toBeInTheDocument()
    expect(screen.queryByText('Address rotation')).not.toBeInTheDocument()
  })
})
