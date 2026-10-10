import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Advanced from '../../../screens/Settings/Advanced'
import { DevModeContext } from '../../../providers/devMode'
import { OptionsContext } from '../../../providers/options'
import { ConfigContext } from '../../../providers/config'
import { BackupContext } from '../../../providers/backup'
import { mockConfigContextValue, mockOptionsContextValue } from '../mocks'

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
  afterEach(() => vi.unstubAllGlobals())

  it('lets the wallet turn off free Taxi auto-claims without changing its other settings', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    const backupAndUpdateConfig = vi.fn()
    const config = { ...mockConfigContextValue.config, autoClaimFreeTaxi: true }
    render(
      <ConfigContext.Provider value={{ ...mockConfigContextValue, config }}>
        <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
          <OptionsContext.Provider value={mockOptionsContextValue as any}>
            <Advanced />
          </OptionsContext.Provider>
        </BackupContext.Provider>
      </ConfigContext.Provider>,
    )
    const toggle = screen.getByRole('switch', { name: 'Automatically claim free Taxi deliveries' })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    expect(backupAndUpdateConfig).toHaveBeenCalledWith({ ...config, autoClaimFreeTaxi: false })
  })

  it('does not show Contracts when dev mode is off', () => {
    renderAdvanced(false)
    expect(screen.getByText('Arkade Mint')).toBeInTheDocument()
    expect(screen.queryByText('Contracts')).not.toBeInTheDocument()
  })

  it('shows Contracts when dev mode is on', () => {
    renderAdvanced(true)
    expect(screen.getByText('Contracts')).toBeInTheDocument()
  })
})
