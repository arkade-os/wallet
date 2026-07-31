import { NotificationRuntimeAdapter } from './types'

/**
 * Native local notifications, replacing the PWA's `Notification` API +
 * service-worker `showNotification` fallback (CAPACITOR.plan.md § Settings
 * Parity Inventory item 2).
 *
 * Only the native adapter lives here: the browser one stays inline in
 * `PwaAppShell` because its fallback touches `navigator.serviceWorker`, which
 * must not appear in a module the Capacitor build can reach.
 *
 * As elsewhere, the plugin loads through a memoized dynamic import so it stays
 * out of the PWA bundle's eager graph, and the plugin proxy is dereferenced
 * inline rather than becoming a promise's resolution value.
 */
let notificationsModule: Promise<typeof import('@capacitor/local-notifications')> | undefined
const notificationsPlugin = () => (notificationsModule ??= import('@capacitor/local-notifications'))

/**
 * Local notification IDs must be unique 32-bit ints. A per-session counter is
 * enough: these are fire-and-forget notifications we never cancel or update,
 * and the OS coalesces them into the app's notification list either way.
 */
let nextNotificationId = 1

export const nativeNotifications: NotificationRuntimeAdapter = {
  requestPermission: async () => {
    const { LocalNotifications } = await notificationsPlugin()
    // Already-granted permission short-circuits, so re-toggling the setting
    // does not re-prompt (iOS only ever shows the system prompt once anyway).
    const current = await LocalNotifications.checkPermissions()
    if (current.display === 'granted') return true
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  },

  send: async (title, body) => {
    const { LocalNotifications } = await notificationsPlugin()
    const { display } = await LocalNotifications.checkPermissions()
    if (display !== 'granted') return
    await LocalNotifications.schedule({
      notifications: [{ id: nextNotificationId++, title, body }],
    })
  },

  notifyPaymentReceived: async (sats) => {
    await nativeNotifications.send('Payment received', `You received ${sats} sats`)
  },
  notifyTxSettled: async () => {
    await nativeNotifications.send('Transaction settled', 'Your transaction has settled')
  },
  notifyNewUpdateAvailable: async () => {
    await nativeNotifications.send('Update available', 'A new version of Arkade Wallet is available')
  },
}
