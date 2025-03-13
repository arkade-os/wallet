/**
 * Utility functions to detect if the app is installed as a PWA
 */

// Storage keys
const PWA_DISMISSED_KEY = 'pwa_install_popup_dismissed'
const PWA_DISMISSED_EXPIRY_KEY = 'pwa_install_popup_dismissed_expiry'
const PWA_INTERACTION_COUNT_KEY = 'pwa_interaction_count'

// Type for navigator with standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

/**
 * Checks if the app is running in standalone mode (installed as PWA)
 * @returns boolean indicating if the app is installed as a PWA
 */
export const isPWAInstalled = (): boolean => {
  // Check if the app is in standalone mode (installed as PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true ||
    document.referrer.includes('android-app://')

  return isStandalone
}

/**
 * Safely gets a value from localStorage with a fallback
 */
const getStorageItem = <T>(key: string, fallback: T, parser: (val: string) => T): T => {
  try {
    const item = localStorage.getItem(key)
    return item !== null ? parser(item) : fallback
  } catch (e) {
    return fallback
  }
}

/**
 * Safely sets a value in localStorage
 */
const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value)
}

/**
 * Safely removes a value from localStorage
 */
const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key)
}

/**
 * Checks if the app is running on iOS
 * @returns boolean indicating if the app is running on iOS
 */
export const isIOS = (): boolean => {
  const userAgent = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
}

/**
 * Checks if the app is running on Android
 * @returns boolean indicating if the app is running on Android
 */
export const isAndroid = (): boolean => {
  const userAgent = window.navigator.userAgent
  return /Android/.test(userAgent)
}

/**
 * Checks if the app is running in a mobile browser
 * @returns boolean indicating if the app is running in a mobile browser
 */
export const isMobileBrowser = (): boolean => {
  return isIOS() || isAndroid()
}

/**
 * Increments the interaction count to determine when to show the popup
 */
export const incrementInteractionCount = (): number => {
  const currentCount = getStorageItem(PWA_INTERACTION_COUNT_KEY, 0, (val) => parseInt(val, 10))
  const newCount = currentCount + 1
  setStorageItem(PWA_INTERACTION_COUNT_KEY, newCount.toString())
  return newCount
}

/**
 * Checks if the popup has been dismissed recently
 * @returns boolean indicating if the popup has been dismissed
 */
export const hasPopupBeenDismissed = (): boolean => {
  const dismissed = getStorageItem(PWA_DISMISSED_KEY, false, (val) => val === 'true')

  if (dismissed) {
    // Check if the dismissal has expired
    const expiryTime = getStorageItem(PWA_DISMISSED_EXPIRY_KEY, 0, (val) => parseInt(val, 10))
    if (expiryTime > Date.now()) {
      return true // Still within expiry period
    } else {
      // Expired, reset the dismissal
      removeStorageItem(PWA_DISMISSED_KEY)
      removeStorageItem(PWA_DISMISSED_EXPIRY_KEY)
      return false
    }
  }

  return false
}

/**
 * Checks if the app should show the PWA installation popup
 * @param walletUnlocked Boolean indicating if the wallet is unlocked
 * @returns boolean indicating if the app should show the PWA installation popup
 */
export const shouldShowPWAInstallPopup = (walletUnlocked: boolean = false): boolean => {
  // Only show the popup if:
  // 1. The app is not already installed as a PWA
  // 2. The app is running in a mobile browser
  // 3. The user hasn't dismissed the popup recently
  // 4. The user has interacted with the app enough (at least 5 interactions)
  // 5. The wallet is unlocked (onboarding completed)
  const interactionCount = getStorageItem(PWA_INTERACTION_COUNT_KEY, 0, (val) => parseInt(val, 10))
  const hasEnoughInteractions = interactionCount >= 5

  return !isPWAInstalled() && isMobileBrowser() && !hasPopupBeenDismissed() && hasEnoughInteractions && walletUnlocked
}

/**
 * Marks the PWA installation popup as dismissed in localStorage with an expiry time
 * @param days Number of days until the dismissal expires (default: 7)
 */
export const markPWAInstallPopupAsDismissed = (days = 7): void => {
  const expiryTime = Date.now() + days * 24 * 60 * 60 * 1000
  setStorageItem(PWA_DISMISSED_KEY, 'true')
  setStorageItem(PWA_DISMISSED_EXPIRY_KEY, expiryTime.toString())
}

/**
 * Resets the PWA installation popup dismissed state in localStorage
 */
export const resetPWAInstallPopupDismissed = (): void => {
  removeStorageItem(PWA_DISMISSED_KEY)
  removeStorageItem(PWA_DISMISSED_EXPIRY_KEY)
}
