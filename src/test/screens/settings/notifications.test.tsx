import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
const nativeMock = vi.hoisted(() => ({
  android: false,
  configure: vi.fn(),
  status: vi.fn(),
}))

vi.mock('../../../lib/nativePlatform', async (original) => ({
  ...(await original<typeof import('../../../lib/nativePlatform')>()),
  isNativeAndroid: () => nativeMock.android,
}))
vi.mock('../../../lib/nativeBackground', () => ({
  configureNativeBackground: nativeMock.configure,
  getNativeBackgroundStatus: nativeMock.status,
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
    nativeMock.android = false
    nativeMock.configure.mockResolvedValue(undefined)
    nativeMock.status.mockResolvedValue({
      enabled: true,
      permissionGranted: true,
      scheduled: false,
      nextExpiryMs: null,
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

  it('does not enable notifications or send a success test when the Android reminder channel is blocked', async () => {
    nativeMock.android = true
    nativeMock.configure.mockResolvedValue({ enabled: true, permissionGranted: false, scheduled: false })
    const backupAndUpdateConfig = vi.fn()
    render(
      <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
        <ConfigContext.Provider
          value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, notifications: false } }}
        >
          <Notifications />
        </ConfigContext.Provider>
      </BackupContext.Provider>,
    )
    const toggle = screen.getByRole('switch', { name: 'Allow notifications' })
    expect(toggle).toHaveAccessibleDescription(
      'Get wallet activity updates and reminders before known coin expiry. Android may delay reminders; open Arkade to renew.',
    )
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(backupAndUpdateConfig).toHaveBeenCalledWith({ ...mockConfigContextValue.config, notifications: false }),
    )
    expect(notificationsMock.sendTestNotification).not.toHaveBeenCalled()
    expect(screen.getByText(/Allow Arkade notifications and Wallet reminders in Android Settings/)).toBeInTheDocument()
  })

  it('keeps notifications enabled when permission is granted and there is no expiry to schedule', async () => {
    nativeMock.android = true
    render(
      <ConfigContext.Provider
        value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, notifications: true } }}
      >
        <Notifications />
      </ConfigContext.Provider>,
    )
    await waitFor(() => expect(nativeMock.status).toHaveBeenCalledOnce())
    expect(screen.getByTestId('toggle-notifications')).toHaveAttribute('data-checked', 'true')
    expect(screen.queryByText(/Allow Arkade notifications/)).not.toBeInTheDocument()
  })

  it('refreshes the reminder permission on foreground return without changing the saved preference', async () => {
    nativeMock.android = true
    const backupAndUpdateConfig = vi.fn()
    render(
      <BackupContext.Provider value={{ backupAndUpdateConfig } as any}>
        <ConfigContext.Provider
          value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, notifications: true } }}
        >
          <Notifications />
        </ConfigContext.Provider>
      </BackupContext.Provider>,
    )
    await waitFor(() => expect(nativeMock.status).toHaveBeenCalledOnce())
    nativeMock.status.mockResolvedValueOnce({ enabled: true, permissionGranted: false, scheduled: false })
    await act(async () => window.dispatchEvent(new Event('arkade-native-resumed')))
    expect(screen.getByTestId('toggle-notifications')).toHaveAttribute('data-checked', 'false')
    expect(screen.getByText(/Allow Arkade notifications and Wallet reminders in Android Settings/)).toBeInTheDocument()
    expect(backupAndUpdateConfig).not.toHaveBeenCalled()
  })
})
