import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Advanced from '../../../screens/Settings/Advanced'
import { DevModeContext } from '../../../providers/devMode'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { OptionsContext } from '../../../providers/options'
import { mockNavigationContextValue, mockOptionsContextValue } from '../mocks'

function renderAdvanced(devMode: boolean) {
  const navigate = vi.fn()
  render(
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
      <DevModeContext.Provider value={{ devMode, handleTap: () => {} }}>
        <OptionsContext.Provider value={mockOptionsContextValue as any}>
          <Advanced />
        </OptionsContext.Provider>
      </DevModeContext.Provider>
    </NavigationContext.Provider>,
  )
  return navigate
}

describe('Advanced screen', () => {
  it('does not show Contracts when dev mode is off', () => {
    renderAdvanced(false)
    expect(screen.getByText('Arkade Mint')).toBeInTheDocument()
    expect(screen.queryByText('Contracts')).not.toBeInTheDocument()
  })

  it('shows Contracts when dev mode is on', () => {
    renderAdvanced(true)
    expect(screen.getByText('Contracts')).toBeInTheDocument()
  })

  it('opens Arkade Mint settings directly from Advanced', () => {
    const navigate = renderAdvanced(false)
    fireEvent.click(screen.getByRole('button', { name: 'Arkade Mint' }))
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetsSettings)
  })
})
