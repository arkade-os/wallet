import { ReactNode, useMemo } from 'react'
import { RuntimeContext } from './RuntimeContext'
import {
  DeviceRuntimeAdapter,
  LifecycleRuntimeAdapter,
  LinkRuntimeAdapter,
  NotificationRuntimeAdapter,
  RuntimeCapabilities,
  RuntimeContextValue,
  SecurityRuntimeAdapter,
} from './types'
import { nativeWalletEvents, nativeWalletFactory } from './wallet/nativeWallet'
import { nativeSwapFactory } from './swaps/nativeSwaps'
import { nativeSecretStorage } from './secretStorage'
import { setSecretStore } from '../lib/secretStore'

/**
 * Phase 1 native shell.
 *
 * The native projects, plugins, and adapter implementations land in later
 * phases (see CAPACITOR.plan.md § Phased Plan). For now this shell compiles,
 * boots the shared app tree without touching `navigator.serviceWorker`, and
 * exposes placeholder adapters that fail loudly for anything not yet wired.
 * Each placeholder is tracked in the parity map with its target phase.
 */
const notImplemented = (feature: string): Promise<never> =>
  Promise.reject(new Error(`[CapacitorAppShell] ${feature} is not implemented yet`))

// Reflects the intended native capability set; individual adapters below are
// wired plugin-by-plugin in later phases.
const nativeCapabilities: RuntimeCapabilities = {
  serviceWorker: false,
  nativeBiometrics: true,
  webAuthn: false,
  localNotifications: true,
  pushNotifications: false,
  notificationsSupported: true,
  nativeScanner: true,
  browserScanner: false,
  nativeShare: true,
  nativeClipboard: true,
  hardwareBackButton: true,
  appUrlOpen: true,
}

const nativeLinks: LinkRuntimeAdapter = {
  getInitialLink: async () => undefined,
  subscribe: () => () => {},
}

const nativeLifecycle: LifecycleRuntimeAdapter = {
  onResume: () => () => {},
  onPause: () => () => {},
  onBackButton: () => () => {},
}

const nativeDevice: DeviceRuntimeAdapter = {
  scanQrCode: () => notImplemented('device.scanQrCode'),
  copyToClipboard: () => notImplemented('device.copyToClipboard'),
  share: () => notImplemented('device.share'),
  haptic: () => notImplemented('device.haptic'),
  openExternal: () => notImplemented('device.openExternal'),
}

const nativeNotifications: NotificationRuntimeAdapter = {
  requestPermission: async () => false,
  send: () => notImplemented('notifications.send'),
  notifyPaymentReceived: () => notImplemented('notifications.notifyPaymentReceived'),
  notifyTxSettled: () => notImplemented('notifications.notifyTxSettled'),
  notifyNewUpdateAvailable: () => notImplemented('notifications.notifyNewUpdateAvailable'),
}

const nativeSecurity: SecurityRuntimeAdapter = {
  isBiometricUnlockAvailable: async () => false,
  saveBiometricUnlockSecret: () => notImplemented('security.saveBiometricUnlockSecret'),
  getBiometricUnlockSecret: () => notImplemented('security.getBiometricUnlockSecret'),
  clearBiometricUnlockSecret: () => notImplemented('security.clearBiometricUnlockSecret'),
}

/**
 * Native Capacitor app shell. Boots the shared app tree without any
 * service-worker dependency and exposes (currently placeholder) native runtime
 * services.
 */
// Route encrypted-secret persistence through the native adapter (see
// CAPACITOR.plan.md § Storage and Secrets). Set eagerly at module load so any
// secret access during bootstrap uses the right store.
setSecretStore(nativeSecretStorage)

export function CapacitorAppShell({ children }: { children: ReactNode }) {
  const value = useMemo<RuntimeContextValue>(
    () => ({
      kind: 'native-capacitor',
      capabilities: nativeCapabilities,
      walletFactory: nativeWalletFactory,
      walletEvents: nativeWalletEvents,
      swaps: nativeSwapFactory,
      secretStorage: nativeSecretStorage,
      links: nativeLinks,
      lifecycle: nativeLifecycle,
      device: nativeDevice,
      notifications: nativeNotifications,
      security: nativeSecurity,
    }),
    [],
  )

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}
