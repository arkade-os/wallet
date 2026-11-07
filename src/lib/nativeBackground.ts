import { invokeWalletHost, isNativeAndroid } from './nativePlatform'

export type BackgroundStatus = {
  enabled: boolean
  permissionGranted: boolean
  nextExpiryMs?: number | null
  scheduled: boolean
  reminderAtMs?: number | null
}

export async function configureNativeBackground(
  enabled: boolean,
  nextRollover: number,
): Promise<BackgroundStatus | undefined> {
  if (!isNativeAndroid()) return
  const nextExpiryMs = Number.isFinite(nextRollover) && nextRollover > 0 ? nextRollover * 1000 : null
  return invokeWalletHost<BackgroundStatus>('configure_background', { enabled, nextExpiryMs })
}

export async function getNativeBackgroundStatus(): Promise<BackgroundStatus | undefined> {
  if (isNativeAndroid()) return invokeWalletHost<BackgroundStatus>('background_status')
}

export async function clearNativeBackground(): Promise<void> {
  if (isNativeAndroid()) await invokeWalletHost('clear_background')
}
