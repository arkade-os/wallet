import { RuntimeKind } from './runtime'

/**
 * Runtime service contracts provided by the active app shell.
 *
 * These mirror the proposed contracts in CAPACITOR.plan.md § Proposed Runtime
 * Contracts. The app shell (PWA or Capacitor) implements them and exposes them
 * through {@link RuntimeContextValue}; screens and providers consume the
 * interfaces rather than concrete Capacitor or browser APIs.
 *
 * Phase 1 scope: capability flags plus the device/lifecycle/link/notification/
 * security adapters. The wallet runtime boundary (`walletFactory`,
 * `walletEvents`) is introduced in Phase 2 alongside the wallet provider
 * changes, and will be added to {@link RuntimeContextValue} then.
 */

export type Unsubscribe = () => void

export interface RuntimeCapabilities {
  serviceWorker: boolean
  nativeBiometrics: boolean
  webAuthn: boolean
  localNotifications: boolean
  pushNotifications: boolean
  nativeScanner: boolean
  browserScanner: boolean
  nativeShare: boolean
  nativeClipboard: boolean
  hardwareBackButton: boolean
  appUrlOpen: boolean
}

export type NormalizedRuntimeLink =
  | { type: 'app'; appId: string; query?: string; rawUrl: string }
  | { type: 'note'; note: string; rawUrl: string }
  | { type: 'unknown'; rawUrl: string }

export interface LinkRuntimeAdapter {
  getInitialLink(): Promise<NormalizedRuntimeLink | undefined>
  subscribe(handler: (link: NormalizedRuntimeLink) => void): Unsubscribe
  clearConsumedLink?(): void
}

export interface LifecycleRuntimeAdapter {
  onResume(handler: () => void): Unsubscribe
  onPause(handler: () => void): Unsubscribe
  onBackButton(handler: () => void): Unsubscribe
}

export type HapticKind = 'subtle' | 'warning' | 'success'

export interface DeviceRuntimeAdapter {
  scanQrCode?(): Promise<string>
  copyToClipboard(value: string): Promise<void>
  share(data: ShareData): Promise<void>
  haptic(kind: HapticKind): Promise<void>
  openExternal(url: string): Promise<void>
}

export interface SecurityRuntimeAdapter {
  isBiometricUnlockAvailable(): Promise<boolean>
  saveBiometricUnlockSecret(secret: string): Promise<void>
  getBiometricUnlockSecret(): Promise<string | undefined>
  clearBiometricUnlockSecret(): Promise<void>
}

export interface NotificationRuntimeAdapter {
  requestPermission(): Promise<boolean>
  send(title: string, body: string, options?: { icon?: string }): Promise<void>
  notifyPaymentReceived(sats: number): Promise<void>
  notifyTxSettled(): Promise<void>
  notifyNewUpdateAvailable(): Promise<void>
}

/**
 * Runtime services provided by the active app shell. Consumed via
 * `useRuntime()` from `src/runtime/RuntimeContext`.
 */
export interface RuntimeContextValue {
  kind: RuntimeKind
  capabilities: RuntimeCapabilities
  links: LinkRuntimeAdapter
  lifecycle: LifecycleRuntimeAdapter
  device: DeviceRuntimeAdapter
  notifications: NotificationRuntimeAdapter
  security: SecurityRuntimeAdapter
}
