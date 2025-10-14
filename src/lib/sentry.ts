/**
 * Check if the current environment is production (not localhost)
 * @returns true if the hostname is not localhost or 127.0.0.1
 */
export const isProduction = (): boolean => {
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
