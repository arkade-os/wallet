import { isNativeRuntime } from '../runtime/runtime'

/**
 * Check if the current environment is production (not localhost)
 * @returns true if the hostname is not localhost or 127.0.0.1
 */
export const isProduction = (): boolean => {
  // Under Capacitor the WebView serves from capacitor://localhost /
  // http://localhost, so a hostname check would disable crash reporting on
  // every native build. Native builds are always production-grade.
  if (isNativeRuntime()) return true
  const hostname = window.location.hostname
  return hostname !== 'localhost' && hostname !== '127.0.0.1'
}

/**
 * Check if Sentry should be initialized
 * @param dsn - The Sentry DSN from environment variables
 * @returns true if DSN is provided and environment is production
 */
export const shouldInitializeSentry = (dsn: string | undefined): boolean => {
  return Boolean(dsn) && isProduction()
}
