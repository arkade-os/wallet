import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Notifications from '../../../screens/Settings/Notifications'
import { ConfigContext } from '../../../providers/config'
import { mockConfigContextValue } from '../mocks'

describe('Notifications screen', () => {
  it('renders the notifications screen with the correct elements', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Notifications />
      </ConfigContext.Provider>,
    )
    expect(screen.getByText('Allow notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications').getAttribute('checked')).toBe('true')
  })

  it('renders the notifications screen with the correct toggle', () => {
    render(
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Notifications />
      </ConfigContext.Provider>,
    )
    expect(screen.getByTestId('toggle-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications').getAttribute('checked')).toBe('true')
  })
})
