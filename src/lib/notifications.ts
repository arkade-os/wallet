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
 * URL-safe base64 to Uint8Array conversion
 * Converts VAPID public key from base64url string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Normalize the base64url string by removing any whitespace
  const normalized = base64String.trim()

  // Try @scure/base first (expects no padding for base64url)
  try {
    return base64url.decode(normalized)
  } catch (e) {
    // Fallback: Manual conversion if @scure/base fails
    // Replace base64url chars with base64, then decode
    const base64 = normalized.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    // Convert to bytes
    const raw = atob(padded)
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i)
    }
    return bytes
  }
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
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
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
export const subscribeToPushNotifications = async (walletAddress: string): Promise<boolean> => {
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
    console.log('Push subscription: waiting for service worker...')
    const registration = await navigator.serviceWorker.ready
    console.log('Push subscription: service worker ready')

    // Convert VAPID key
    console.log('Push subscription: converting VAPID key...')
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    console.log('Push subscription: VAPID key converted, length:', applicationServerKey.length)

    // Check for existing subscription first
    console.log('Push subscription: checking for existing subscription...')
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('Push subscription: found existing subscription, unsubscribing first...')
      await existingSubscription.unsubscribe()
      console.log('Push subscription: unsubscribed from old subscription')
    }

    // Subscribe to push manager
    console.log('Push subscription: subscribing to push manager...')
    console.log('Push subscription: options:', {
      userVisibleOnly: true,
      applicationServerKeyLength: applicationServerKey.length,
    })
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
    console.log('Push subscription: browser subscription successful')
    console.log('Push subscription: endpoint:', subscription.endpoint)

    // Send subscription to push service
    const pushServiceUrl = getPushServiceUrl()
    console.log('Push subscription: sending to push service:', pushServiceUrl)
    const response = await fetch(`${pushServiceUrl}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        subscription: subscription.toJSON(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Push service error response:', errorText)
      throw new Error(`Failed to register subscription: ${response.statusText}`)
    }

    console.log('Push subscription: successfully registered with push service')
    return true
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return false
  }
}

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPushNotifications = async (walletAddress: string): Promise<boolean> => {
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
