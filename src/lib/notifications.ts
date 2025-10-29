import { base64url } from '@scure/base'

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
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options)
      })
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

/**
 * URL-safe base64 to Uint8Array conversion using @scure/base
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  return base64url.decode(base64String)
}

/**
 * Get the push service URL from environment
 */
function getPushServiceUrl(): string {
  return import.meta.env.VITE_PUSH_SERVICE_URL || 'https://push.arkade.money'
}

/**
 * Get the VAPID public key from environment
 */
function getVapidPublicKey(): string {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
}

/**
 * Check if push notifications are supported
 */
export const isPushSupported = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current push subscription
 */
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch (error) {
    console.error('Failed to get push subscription:', error)
    return null
  }
}

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async (
  walletAddress: string
): Promise<boolean> => {
  if (!isPushSupported()) {
    console.error('Push notifications not supported')
    return false
  }

  const vapidPublicKey = getVapidPublicKey()
  if (!vapidPublicKey) {
    console.error('VAPID public key not configured')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    // Send subscription to push service
    const pushServiceUrl = getPushServiceUrl()
    const response = await fetch(`${pushServiceUrl}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        subscription: subscription.toJSON(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to register subscription: ${response.statusText}`)
    }

    return true
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    return false
  }
}

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async (
  walletAddress: string
): Promise<boolean> => {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return true // Already unsubscribed
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe()

    // Remove subscription from push service
    const pushServiceUrl = getPushServiceUrl()
    const response = await fetch(`${pushServiceUrl}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        endpoint: subscription.endpoint,
      }),
    })

    if (!response.ok) {
      console.error('Failed to remove subscription from service:', response.statusText)
    }

    return true
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error)
    return false
  }
}
