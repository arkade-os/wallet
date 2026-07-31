import { extractError } from './error'
import { getDeviceRuntime } from './device'

/**
 * Sharing, routed through the active runtime's device adapter: the Web Share
 * API on the PWA, `@capacitor/share` on native (see `src/runtime/device.ts`).
 *
 * The availability check stays synchronous because it gates a button's
 * disabled state during render; on native the system share sheet is always
 * available, so it is unconditionally true there.
 */
export function canBrowserShareData(data: any): boolean {
  return getDeviceRuntime().canShare(data)
}

export async function shareData(data: any) {
  try {
    await getDeviceRuntime().share(data)
  } catch (err) {
    throw `Error sharing data: ${extractError(err)}`
  }
}
