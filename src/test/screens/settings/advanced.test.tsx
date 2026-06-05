import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Advanced from '../../../screens/Settings/Advanced'
import { DevModeContext } from '../../../providers/devMode'
import { OptionsContext } from '../../../providers/options'
import { mockOptionsContextValue } from '../mocks'

function renderAdvanced(devMode: boolean) {
  return render(
    <DevModeContext.Provider value={{ devMode, handleTap: () => {} }}>
      <OptionsContext.Provider value={mockOptionsContextValue as any}>
        <Advanced />
      </OptionsContext.Provider>
    </DevModeContext.Provider>,
  )
}

describe('Advanced screen', () => {
  it('does not show Contracts when dev mode is off', () => {
    renderAdvanced(false)
    expect(screen.getByText('Arkade Mint')).toBeInTheDocument()
    expect(screen.getByText('Boltz')).toBeInTheDocument()
    expect(screen.queryByText('contracts')).not.toBeInTheDocument()
  })

  it('shows Contracts when dev mode is on', () => {
    renderAdvanced(true)
    expect(screen.getByText('contracts')).toBeInTheDocument()
  })
})
