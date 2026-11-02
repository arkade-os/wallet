import { isNativeHost } from './nativeBridge'
import { isNativeAndroid } from './nativePlatform'

export const notificationApiSupport =
  isNativeHost() || ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window)

export const requestPermission = async (): Promise<boolean> => {
  if (isNativeHost()) {
    const native = await import('@tauri-apps/plugin-notification')
    return (await native.isPermissionGranted()) || (await native.requestPermission()) === 'granted'
  }
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export const sendNotification = (title: string, body: string) => {
  if (isNativeHost()) {
    void import('@tauri-apps/plugin-notification')
      .then(async (native) => {
        if (!(await native.isPermissionGranted())) return
        if (isNativeAndroid()) {
          await native.createChannel({
            id: 'wallet-activity',
            name: 'Wallet activity',
            visibility: native.Visibility.Private,
          })
          native.sendNotification({ title, body, channelId: 'wallet-activity', visibility: native.Visibility.Private })
        } else native.sendNotification({ title, body })
      })
      .catch(() => undefined)
    return
  }
  if (!notificationApiSupport) return
  if (Notification.permission !== 'granted') return
  const options = { body, icon: '/arkade-icon.svg' }
  try {
    new Notification(title, options)
  } catch {
    navigator.serviceWorker.ready.then((registration) => registration.showNotification(title, options)).catch(() => {})
  }
}

export const notifyNewUpdateAvailable = () => {
  const body = 'Close all tabs and re-open to update'
  const title = 'Update available'
  sendNotification(title, body)
}

export const sendTestNotification = () => {
  const body = 'If you read this, everything is ok'
  const title = 'Test notification'
  sendNotification(title, body)
}
