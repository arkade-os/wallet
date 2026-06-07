import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Notifications from '../../../screens/Settings/Notifications'
import { ConfigContext } from '../../../providers/config'
import { RuntimeContext } from '../../../runtime/RuntimeContext'
import { mockConfigContextValue, mockRuntimeContextValue } from '../mocks'

const renderNotifications = () =>
  render(
    <RuntimeContext.Provider value={mockRuntimeContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue as any}>
        <Notifications />
      </ConfigContext.Provider>
    </RuntimeContext.Provider>,
  )

describe('Notifications screen', () => {
  it('renders the notifications screen with the correct elements', () => {
    renderNotifications()
    expect(screen.getByText('Allow notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications').getAttribute('data-checked')).toBe('true')
  })

  it('renders the notifications screen with the correct toggle', () => {
    renderNotifications()
    expect(screen.getByTestId('toggle-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications').getAttribute('data-checked')).toBe('true')
  })
})
