import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SettingsMenu from '../../../screens/Settings/Menu'
import { OptionsContext } from '../../../providers/options'
import { mockOptionsContextValue } from '../mocks'

function renderSettingsMenu() {
  return render(
    <OptionsContext.Provider value={mockOptionsContextValue as any}>
      <SettingsMenu />
    </OptionsContext.Provider>,
  )
}

describe('Settings menu', () => {
  it('orders settings by product priority instead of alphabetically', () => {
    renderSettingsMenu()

    const orderedOptions = [
      'display',
      'notifications',
      'notes',
      'about',
      'support',
      'advanced',
      'backup',
      'lock wallet',
      'reset wallet',
    ].map((label) => screen.getByText(label))

    for (let index = 0; index < orderedOptions.length - 1; index++) {
      expect(
        orderedOptions[index].compareDocumentPosition(orderedOptions[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    }
  })
})
