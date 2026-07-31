import { ReactNode, useEffect, useMemo } from 'react'
import { RuntimeContext } from './RuntimeContext'
import {
  LifecycleRuntimeAdapter,
  NotificationRuntimeAdapter,
  RuntimeCapabilities,
  RuntimeContextValue,
  SecurityRuntimeAdapter,
} from './types'
import { serviceWorkerWalletEvents, serviceWorkerWalletFactory } from './wallet/serviceWorkerWallet'
import { serviceWorkerSwapFactory } from './swaps/serviceWorkerSwaps'
import { localStorageSecretStorage } from './secretStorage'
import { browserDevice } from './device'
import { browserLinks } from './links'
import { setSecretStore } from '../lib/secretStore'
import { setDeviceRuntime } from '../lib/device'

/**
 * Registers a service worker updatefound listener to reload the page when a
 * new service worker is found, thus preventing some nasty race conditions
 * when updating the service worker.
 *
 * Moved from `src/index.tsx` (see PR #752 "fix unlock splash"): actual
 * registration happens inside `ServiceWorkerWallet.setup` (see
 * `runtime/wallet/serviceWorkerWallet.ts`), so this only listens on whatever
 * registration already exists. This is PWA-only — the Capacitor shell never
 * touches `navigator.serviceWorker`.
 */
const registerServiceWorker = (): void => {
  navigator.serviceWorker?.getRegistration().then((reg) => {
    reg?.addEventListener('updatefound', () => {
      console.log('Service worker update found')
      window.location.reload()
    })
  })
}

const pwaCapabilities: RuntimeCapabilities = {
  serviceWorker: 'serviceWorker' in navigator,
  nativeBiometrics: false,
  webAuthn: typeof window.PublicKeyCredential !== 'undefined',
  localNotifications: false,
  pushNotifications: 'PushManager' in window,
  notificationsSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
  nativeScanner: false,
  browserScanner: true,
  nativeShare: typeof navigator.share === 'function',
  nativeClipboard: false,
  hardwareBackButton: false,
  appUrlOpen: false,
}

const pwaLifecycle: LifecycleRuntimeAdapter = {
  onResume: (handler) => {
    const listener = () => {
      if (document.visibilityState === 'visible') handler()
    }
    document.addEventListener('visibilitychange', listener)
    return () => document.removeEventListener('visibilitychange', listener)
  },
  onPause: (handler) => {
    const listener = () => {
      if (document.visibilityState === 'hidden') handler()
    }
    document.addEventListener('visibilitychange', listener)
    return () => document.removeEventListener('visibilitychange', listener)
  },
  // No hardware back button on the web; nothing to subscribe to.
  onBackButton: () => () => {},
  // A web page cannot close its own tab (window.close() only works for windows
  // the script opened), so there is nothing meaningful to do here.
  exitApp: async () => {},
}

const pwaNotifications: NotificationRuntimeAdapter = {
  requestPermission: async () => {
    if (typeof Notification === 'undefined') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  },
  send: async (title, body, options) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const notificationOptions = { body, icon: options?.icon ?? '/arkade-icon.svg' }
    try {
      new Notification(title, notificationOptions)
    } catch {
      // Some browsers (notably installed PWAs) only allow notifications via the
      // service worker registration. Fall back to that — PWA-only code path.
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, notificationOptions))
        .catch(() => {})
    }
  },
  notifyPaymentReceived: async (sats) => {
    await pwaNotifications.send('Payment received', `You received ${sats} sats`)
  },
  notifyTxSettled: async () => {
    await pwaNotifications.send('Transaction settled', 'Your transaction has settled')
  },
  notifyNewUpdateAvailable: async () => {
    await pwaNotifications.send('Update available', 'A new version of Arkade Wallet is available')
  },
}

// Native secure-storage/biometric unlock is a native-only capability; on the
// web the existing WebAuthn passkey path (src/lib/biometrics.ts) handles unlock.
const pwaSecurity: SecurityRuntimeAdapter = {
  isBiometricUnlockAvailable: async () => false,
  saveBiometricUnlockSecret: async () => {},
  getBiometricUnlockSecret: async () => undefined,
  clearBiometricUnlockSecret: async () => {},
}

/**
 * Browser/PWA app shell. Owns browser-only startup (service worker
 * registration + controller-change reload) and exposes browser-backed runtime
 * services. Renders the shared app tree passed as `children`.
 */
// Route encrypted-secret persistence through localStorage on the PWA (the
// original substrate). Set eagerly at module load so any secret access during
// bootstrap, before the shell effect runs, uses the right store.
setSecretStore(localStorageSecretStorage)
// Same for device capabilities (clipboard, share, haptics, external links):
// src/lib/{clipboard,haptics,share,explorers} route through this seam.
setDeviceRuntime(browserDevice)

export function PwaAppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  const value = useMemo<RuntimeContextValue>(
    () => ({
      kind: 'web-pwa',
      capabilities: pwaCapabilities,
      walletFactory: serviceWorkerWalletFactory,
      walletEvents: serviceWorkerWalletEvents,
      swaps: serviceWorkerSwapFactory,
      secretStorage: localStorageSecretStorage,
      links: browserLinks,
      lifecycle: pwaLifecycle,
      device: browserDevice,
      notifications: pwaNotifications,
      security: pwaSecurity,
    }),
    [],
  )

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}
