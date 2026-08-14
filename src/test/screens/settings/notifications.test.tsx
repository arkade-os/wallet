import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Notifications from '../../../screens/Settings/Notifications'
import { ConfigContext } from '../../../providers/config'
import { BackupContext } from '../../../providers/backup'
import { mockConfigContextValue } from '../mocks'

if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', {
    writable: true,
    configurable: true,
    value: MouseEvent,
  })
}

const toast = vi.fn()
const notificationsMock = vi.hoisted(() => ({
  notificationApiSupport: true,
  requestPermission: vi.fn().mockResolvedValue(true),
  sendTestNotification: vi.fn(),
}))

vi.mock('../../../components/Toast', () => ({
  useToast: () => ({ toast }),
}))

vi.mock('../../../lib/notifications', () => ({
  get notificationApiSupport() {
    return notificationsMock.notificationApiSupport
  },
  requestPermission: notificationsMock.requestPermission,
  sendTestNotification: notificationsMock.sendTestNotification,
}))

describe('Notifications screen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    notificationsMock.notificationApiSupport = true
    notificationsMock.requestPermission.mockResolvedValue(true)
  })

  it('renders the notifications screen with the correct elements', () => {
    render(
      <BackupContext.Provider value={{ backupAndUpdateConfig: vi.fn() } as any}>
        <ConfigContext.Provider value={mockConfigContextValue as any}>
          <Notifications />
        </ConfigContext.Provider>
      </BackupContext.Provider>,
    )

    expect(screen.getByText('Allow notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-notifications').getAttribute('data-checked')).toBe('true')
  })

  it('updates config when the notifications toggle is clicked', async () => {
    const backupAndUpdateConfig = vi.fn()

    render(
      <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
        <ConfigContext.Provider
          value={
            { ...mockConfigContextValue, config: { ...mockConfigContextValue.config, notifications: true } } as any
          }
        >
          <Notifications />
        </ConfigContext.Provider>
      </BackupContext.Provider>,
    )

    fireEvent.click(screen.getByTestId('toggle-notifications'))

    await vi.waitFor(() => {
      expect(backupAndUpdateConfig).toHaveBeenCalledWith({
        ...mockConfigContextValue.config,
        notifications: false,
      })
    })
  })

  it('shows a toast when the browser does not support notifications', () => {
    const backupAndUpdateConfig = vi.fn()
    notificationsMock.notificationApiSupport = false
    const mockConfig = { ...mockConfigContextValue, config: { ...mockConfigContextValue.config, notifications: false } }

    render(
      <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
        <ConfigContext.Provider value={mockConfig as any}>
          <Notifications />
        </ConfigContext.Provider>
      </BackupContext.Provider>,
    )

    fireEvent.click(screen.getByTestId('toggle-notifications'))

    expect(toast).toHaveBeenCalledWith('Notifications API not supported')
    expect(backupAndUpdateConfig).not.toHaveBeenCalled()
  })

  it('shows a toast when notification permission is denied', async () => {
    const backupAndUpdateConfig = vi.fn()
    notificationsMock.requestPermission.mockResolvedValue(false)

    render(
      <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
        <ConfigContext.Provider
          value={
            { ...mockConfigContextValue, config: { ...mockConfigContextValue.config, notifications: false } } as any
          }
        >
          <Notifications />
        </ConfigContext.Provider>
      </BackupContext.Provider>,
    )

    fireEvent.click(screen.getByTestId('toggle-notifications'))

    await vi.waitFor(() => {
      expect(notificationsMock.requestPermission).toHaveBeenCalledOnce()
      expect(toast).toHaveBeenCalledWith('Notifications permission denied')
      expect(backupAndUpdateConfig).toHaveBeenCalledWith({
        ...mockConfigContextValue.config,
        notifications: false,
      })
    })
  })
})
