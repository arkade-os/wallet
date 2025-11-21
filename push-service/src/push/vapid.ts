/**
 * VAPID utilities for Web Push
 *
 * VAPID (Voluntary Application Server Identification) keys are used to
 * identify the application server when sending push notifications.
 *
 * Note: The web-push library handles all base64url encoding/decoding internally.
 * If you need base64url utilities for other purposes, use @scure/base library
 * instead of manual implementations:
 *
 * import { base64url } from '@scure/base'
 * const bytes = base64url.decode(str)
 * const str = base64url.encode(bytes)
 */

/**
 * Validate VAPID public key format
 */
export function isValidVapidKey(key: string): boolean {
  // VAPID keys should be base64url encoded strings
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;
  return base64urlPattern.test(key) && key.length > 0;
}

/**
 * Validate VAPID subject format
 */
export function isValidVapidSubject(subject: string): boolean {
  // Subject should be a mailto: or https: URL
  return subject.startsWith('mailto:') || subject.startsWith('https://');
}
