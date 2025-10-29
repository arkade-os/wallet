/**
 * VAPID utilities for Web Push
 *
 * VAPID (Voluntary Application Server Identification) keys are used to
 * identify the application server when sending push notifications.
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

/**
 * URL-safe base64 encode
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Uint8Array to URL-safe base64
 */
export function uint8ArrayToUrlBase64(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
