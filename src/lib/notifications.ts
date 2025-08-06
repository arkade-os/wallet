export const notificationApiSupport =
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

export const requestPermission = async (): Promise<boolean> => {
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export const sendNotification = (title: string, body: string) => {
  if (!notificationApiSupport) return
  const options = { body, icon: '/arkade-icon.svg' }
  try {
    new Notification(title, options)
  } catch {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, options)
        })
      }
    } catch {}
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
