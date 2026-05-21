import ReactDOM from 'react-dom/client'
import './tokens.css'
import './app.css'
import './index.css'
import App from './App'
import { AspProvider } from './providers/asp'
import { ConfigProvider } from './providers/config'
import { FiatProvider } from './providers/fiat'
import { FlowProvider } from './providers/flow'
import { NavigationProvider } from './providers/navigation'
import { NotificationsProvider } from './providers/notifications'
import { WalletProvider } from './providers/wallet'
import { OptionsProvider } from './providers/options'
import { LimitsProvider } from './providers/limits'
import { NudgeProvider } from './providers/nudge'
import * as Sentry from '@sentry/react'
import { SwapsProvider } from './providers/swaps'
import { LnurlProvider } from './providers/lnurl'
import { shouldInitializeSentry } from './lib/sentry'
import { FeesProvider } from './providers/fees'
import { AnnouncementProvider } from './providers/announcements'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { DevModeProvider } from './providers/devMode'

const DEV_SERVICE_WORKER_RESET_KEY = 'arkade-dev-service-worker-reset-attempted'
const DEV_WALLET_STORAGE_RESET_KEY_PREFIX = 'arkade-dev-wallet-storage-reset'

function getDevWalletStorageResetKey() {
  const credential = import.meta.env.VITE_DEV_MNEMONIC || import.meta.env.VITE_DEV_NSEC || 'manual'
  let hash = 5381

  for (let i = 0; i < credential.length; i++) {
    hash = (hash * 33) ^ credential.charCodeAt(i)
  }

  return `${DEV_WALLET_STORAGE_RESET_KEY_PREFIX}:${hash >>> 0}`
}

function reloadAfterUnregisteringServiceWorkers() {
  navigator.serviceWorker
    ?.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .finally(() => window.location.reload())
}

function resetDevWalletStorage() {
  if (!import.meta.env.DEV || import.meta.env.VITE_DEV_RESET_WALLET_ON_BOOT !== 'true') return false

  try {
    const storageResetKey = getDevWalletStorageResetKey()
    if (localStorage.getItem(storageResetKey)) return false
    localStorage.setItem(storageResetKey, 'true')

    localStorage.removeItem('wallet')
    localStorage.removeItem('encrypted_private_key')
    localStorage.removeItem('encrypted_mnemonic')
  } catch {
    // Keep booting even if dev browser storage is unavailable.
  }

  if ('serviceWorker' in navigator) {
    reloadAfterUnregisteringServiceWorkers()
    return true
  }

  window.location.reload()
  return true
}

function resetControlledDevServiceWorker() {
  if (!import.meta.env.DEV || !(import.meta.env.VITE_DEV_MNEMONIC || import.meta.env.VITE_DEV_NSEC)) return false
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return false

  try {
    if (sessionStorage.getItem(DEV_SERVICE_WORKER_RESET_KEY)) return false
    sessionStorage.setItem(DEV_SERVICE_WORKER_RESET_KEY, 'true')
  } catch {
    // Prefer one reload over leaving a stale dev service worker controlling boot.
  }

  reloadAfterUnregisteringServiceWorkers()

  return true
}

// Initialize Sentry only in production and when DSN is provided
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (shouldInitializeSentry(sentryDsn)) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    enableLogs: true,
    ignoreErrors: [/null is not an object.*a\[je\]/i, /translate\.googleapis\.com.*translate_http/],
    denyUrls: [/translate\.google\.com\/translate_a\/element\.js/, /translate\.googleapis\.com/],
    beforeSend(event, hint) {
      const error = hint.originalException
      const isTranslateOrigin =
        (error instanceof Error && error.stack?.includes('translate.google.com')) ||
        event.exception?.values?.some((v) =>
          v.stacktrace?.frames?.some((f) => f.filename?.includes('translate.googleapis.com')),
        )
      if (isTranslateOrigin) {
        return null
      }
      return event
    },
  })
}

// Pre-register service worker so activation happens in parallel with page
// bootstrap (ASP fetch, auth check, etc.). On cold starts this saves the
// full activation wait from the critical path; on warm starts it's a no-op.
const devBootResetting = resetDevWalletStorage() || resetControlledDevServiceWorker()
if ('serviceWorker' in navigator && !devBootResetting) {
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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  // <React.StrictMode>
  <DevModeProvider>
    <NavigationProvider>
      <ConfigProvider>
        <AspProvider>
          <NotificationsProvider>
            <FiatProvider>
              <FlowProvider>
                <WalletProvider>
                  <SwapsProvider>
                    <LnurlProvider>
                      <LimitsProvider>
                        <FeesProvider>
                          <OptionsProvider>
                            <NudgeProvider>
                              <AnnouncementProvider>
                                <ToastProvider>
                                  <ErrorBoundary>
                                    <App />
                                  </ErrorBoundary>
                                </ToastProvider>
                              </AnnouncementProvider>
                            </NudgeProvider>
                          </OptionsProvider>
                        </FeesProvider>
                      </LimitsProvider>
                    </LnurlProvider>
                  </SwapsProvider>
                </WalletProvider>
              </FlowProvider>
            </FiatProvider>
          </NotificationsProvider>
        </AspProvider>
      </ConfigProvider>
    </NavigationProvider>
  </DevModeProvider>,
  // </React.StrictMode>,
)
