import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyAmount } from '../../components/PrivacyAmount'
import { BackupContext } from '../../providers/backup'
import { ConfigContext } from '../../providers/config'
import { mockConfigContextValue } from '../screens/mocks'

describe('PrivacyAmount', () => {
  it('updates the saved balance visibility preference when interactive', () => {
    const backupAndUpdateConfig = vi.fn()

    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
          <PrivacyAmount interactive masked='••••'>
            $8.22
          </PrivacyAmount>
        </BackupContext.Provider>
      </ConfigContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hide balances' }))

    expect(backupAndUpdateConfig).toHaveBeenCalledWith({
      ...mockConfigContextValue.config,
      showBalance: false,
    })
  })
})
