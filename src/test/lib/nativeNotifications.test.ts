import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  createChannel: vi.fn(),
  sendNotification: vi.fn(),
  Visibility: { Private: 'private' },
}))
vi.mock('@tauri-apps/plugin-notification', () => native)
const host = window as any

beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  native.isPermissionGranted.mockResolvedValue(true)
  host.__ARKADE_NATIVE__ = { version: 1, platform: 'ios' }
  host.__TAURI__ = { core: { invoke: vi.fn() } }
})
afterEach(() => {
  delete host.__ARKADE_NATIVE__
  delete host.__TAURI__
  vi.unstubAllGlobals()
})

describe('native notifications', () => {
  it('supports desktop hosts without browser push and requests native permission before delivery', async () => {
    host.__ARKADE_NATIVE__.platform = 'desktop'
    expect('serviceWorker' in navigator).toBe(false)
    expect('PushManager' in window).toBe(false)
    native.isPermissionGranted.mockResolvedValue(false)
    native.requestPermission.mockResolvedValue('granted')
    const notifications = await import('../../lib/notifications')
    expect(notifications.notificationApiSupport).toBe(true)
    expect(await notifications.requestPermission()).toBe(true)
    expect(native.requestPermission).toHaveBeenCalledOnce()
    native.isPermissionGranted.mockResolvedValue(true)
    notifications.sendNotification('Received', 'Payment received')
    await vi.waitFor(() =>
      expect(native.sendNotification).toHaveBeenCalledExactlyOnceWith({ title: 'Received', body: 'Payment received' }),
    )
    expect(native.createChannel).not.toHaveBeenCalled()
  })

  it('uses an existing desktop permission without requesting it again', async () => {
    host.__ARKADE_NATIVE__.platform = 'desktop'
    const notifications = await import('../../lib/notifications')
    expect(await notifications.requestPermission()).toBe(true)
    expect(native.isPermissionGranted).toHaveBeenCalledOnce()
    expect(native.requestPermission).not.toHaveBeenCalled()
  })

  it('does not send desktop notifications when native permission is denied', async () => {
    host.__ARKADE_NATIVE__.platform = 'desktop'
    native.isPermissionGranted.mockResolvedValue(false)
    native.requestPermission.mockResolvedValue('denied')
    const notifications = await import('../../lib/notifications')
    expect(await notifications.requestPermission()).toBe(false)
    notifications.sendNotification('Hidden', 'No permission')
    await vi.waitFor(() => expect(native.isPermissionGranted).toHaveBeenCalledTimes(2))
    expect(native.sendNotification).not.toHaveBeenCalled()
    expect(native.createChannel).not.toHaveBeenCalled()
  })

  it('retains browser permission and delivery without using the native plugin', async () => {
    delete host.__ARKADE_NATIVE__
    delete host.__TAURI__
    const request = vi.fn().mockResolvedValue('granted')
    const sent = vi.fn()
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'granted'
        static requestPermission = request
        constructor(title: string, options: NotificationOptions) {
          sent(title, options)
        }
      },
    )
    vi.stubGlobal('navigator', { serviceWorker: {} })
    vi.stubGlobal('PushManager', class {})
    const notifications = await import('../../lib/notifications')
    expect(notifications.notificationApiSupport).toBe(true)
    expect(await notifications.requestPermission()).toBe(true)
    notifications.sendNotification('Received', 'Payment received')
    expect(request).toHaveBeenCalledOnce()
    expect(sent).toHaveBeenCalledExactlyOnceWith('Received', { body: 'Payment received', icon: '/arkade-icon.svg' })
    expect(native.isPermissionGranted).not.toHaveBeenCalled()
    expect(native.sendNotification).not.toHaveBeenCalled()
  })

  it('uses iOS permissions and local notifications without Android channels', async () => {
    const notifications = await import('../../lib/notifications')
    expect(notifications.notificationApiSupport).toBe(true)
    native.isPermissionGranted.mockResolvedValue(false)
    native.requestPermission.mockResolvedValue('granted')
    expect(await notifications.requestPermission()).toBe(true)
    native.isPermissionGranted.mockResolvedValue(true)
    notifications.sendNotification('Received', 'Payment received')
    await vi.waitFor(() =>
      expect(native.sendNotification).toHaveBeenCalledWith({ title: 'Received', body: 'Payment received' }),
    )
    expect(native.createChannel).not.toHaveBeenCalled()
  })

  it('keeps Android activity notifications private and sends none without permission', async () => {
    host.__ARKADE_NATIVE__.platform = 'android'
    const { sendNotification } = await import('../../lib/notifications')
    sendNotification('Received', 'Payment received')
    await vi.waitFor(() =>
      expect(native.sendNotification).toHaveBeenCalledWith({
        title: 'Received',
        body: 'Payment received',
        channelId: 'wallet-activity',
        visibility: 'private',
      }),
    )
    expect(native.createChannel).toHaveBeenCalledWith({
      id: 'wallet-activity',
      name: 'Wallet activity',
      visibility: 'private',
    })
    native.sendNotification.mockClear()
    native.isPermissionGranted.mockResolvedValue(false)
    sendNotification('Hidden', 'No permission')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(native.sendNotification).not.toHaveBeenCalled()
  })
})
