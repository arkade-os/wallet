/**
 * Environment detection utilities
 */

/**
 * Detects if the app is running in a Capacitor environment
 */
export const isCapacitor = (): boolean => {
  return window.location.protocol === 'capacitor:'
}

/**
 * Checks if service workers are available and should be used
 * Service workers are not used in Capacitor environments
 */
export const isServiceWorkerAvailable = (): boolean => {
  return 'serviceWorker' in navigator && 
         navigator.serviceWorker &&
         !isCapacitor() // Don't use service workers in Capacitor
}
