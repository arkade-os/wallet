import { ReactNode, useEffect, useMemo } from 'react'
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
import { serviceWorkerWalletEvents, serviceWorkerWalletFactory } from './wallet/serviceWorkerWallet'
import { serviceWorkerSwapFactory } from './swaps/serviceWorkerSwaps'
import { localStorageSecretStorage } from './secretStorage'
import { setSecretStore } from '../lib/secretStore'

/**
 * Registers the wallet service worker and reloads on controller change.
 *
 * Moved verbatim from `src/index.tsx`: pre-registering lets activation happen
 * in parallel with page bootstrap (ASP fetch, auth check, etc.). On cold starts
 * this keeps the activation wait off the critical path; on warm starts it's a
 * no-op. This is PWA-only — the Capacitor shell never touches
 * `navigator.serviceWorker`.
 */
const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/wallet-service-worker.mjs').catch(() => {})

  // check if there's a service worker controlling the page
  const previousSW = navigator.serviceWorker.controller

  // This fires when the service worker controlling this page changes,
  // eg a new worker has skipped waiting and become the new active worker.
  // We reload the page to have the new service worker properly initialized.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // don't reload on fresh install, only when the service worker changes (eg update)
    if (previousSW) window.location.reload()
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

// Link ingestion stays in the existing PWA code paths (src/lib/deepLink.ts,
// src/lib/arknote.ts, src/providers/wallet.tsx hash parsing) until a later
// phase routes them through this adapter; expose a no-op surface for now.
const pwaLinks: LinkRuntimeAdapter = {
  getInitialLink: async () => undefined,
  subscribe: () => () => {},
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
}

const HAPTIC_PATTERNS: Record<Parameters<DeviceRuntimeAdapter['haptic']>[0], number | number[]> = {
  subtle: 10,
  warning: [30, 40, 30],
  success: [10, 30, 10],
}

const pwaDevice: DeviceRuntimeAdapter = {
  copyToClipboard: async (value) => {
    await navigator.clipboard.writeText(value)
  },
  share: async (data) => {
    await navigator.share(data)
  },
  haptic: async (kind) => {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(HAPTIC_PATTERNS[kind])
  },
  openExternal: async (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
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
      links: pwaLinks,
      lifecycle: pwaLifecycle,
      device: pwaDevice,
      notifications: pwaNotifications,
      security: pwaSecurity,
    }),
    [],
  )

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}
