import { Capacitor } from '@capacitor/core'

/**
 * Platform detection utilities for Capacitor mobile support
 */

/**
 * Check if app is running in a native mobile environment (iOS/Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform()
}

/**
 * Check if app is running in web browser (not native)
 */
export const isWebPlatform = (): boolean => {
  return !Capacitor.isNativePlatform()
}

/**
 * Get the current platform name
 * @returns 'ios' | 'android' | 'web'
 */
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web'
}

/**
 * Check if running on iOS (native)
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios'
}

/**
 * Check if running on Android (native)
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android'
}

/**
 * Check if Service Workers are available and should be used
 * Service Workers are not needed in native Capacitor apps
 */
export const shouldUseServiceWorker = (): boolean => {
  // In native apps, we don't use service workers
  if (isNativePlatform()) return false

  // In web, check if service workers are available
  return 'serviceWorker' in navigator
}

/**
 * Check if app is running as PWA (installed web app)
 */
export const isPWA = (): boolean => {
  if (isNativePlatform()) return false
  return window.matchMedia('(display-mode: standalone)').matches
}
