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
import { beforeSend, scrubBreadcrumb, shouldInitializeSentry } from './lib/sentry'
import { FeesProvider } from './providers/fees'
import { AnnouncementProvider } from './providers/announcements'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { DevModeProvider } from './providers/devMode'
import { AssetsProvider } from './providers/assets'
import { BackupProvider } from './providers/backup'
import { LanguageProvider } from './providers/language'
import { reloadOnWorkerTakeover } from './lib/serviceWorkerTakeover'
import { initializeSecretStore } from './lib/secretStore'
import NativeAppShell from './components/NativeAppShell'
import './native.css'
import { hasPendingNativeStateRestore } from './lib/nativeStateBackup'
import NativeStateBackup from './components/NativeStateBackup'
import NativeRecoveryShell from './components/NativeRecoveryShell'

// On takeover, not on updatefound: a page reloaded while the new worker still installs boots against the
// old one, which skipWaiting then retires mid-init, leaving "Connecting to service worker" for the 30s timeout.
reloadOnWorkerTakeover(navigator.serviceWorker, () => window.location.reload())

// Initialize Sentry only in production and when DSN is provided
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (shouldInitializeSentry(sentryDsn)) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    enableLogs: true,
    ignoreErrors: [/null is not an object.*a\[je\]/i, /translate\.googleapis\.com.*translate_http/],
    denyUrls: [/translate\.google\.com\/translate_a\/element\.js/, /translate\.googleapis\.com/],
    beforeSend,
    beforeBreadcrumb: scrubBreadcrumb,
  })
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
let bootstrapPending = false

async function bootstrap() {
  if (bootstrapPending) return
  bootstrapPending = true
  root.render(
    <main
      role='status'
      aria-busy
      className='flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center'
    >
      <h1 className='text-xl font-semibold'>Opening secure storage</h1>
      <button type='button' disabled className='button dark w-full max-w-xs'>
        Checking…
      </button>
    </main>,
  )
  try {
    await initializeSecretStore()
  } catch {
    bootstrapPending = false
    root.render(
      <main role='alert' className='flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center'>
        <h1 className='text-xl font-semibold'>Wallet storage unavailable</h1>
        <p>Unlock your device’s secure storage or desktop keyring, then retry.</p>
        <p>Your wallet data is preserved.</p>
        <button type='button' onClick={() => void bootstrap()} className='button dark w-full max-w-xs'>
          Retry
        </button>
      </main>,
    )
    return
  }
  bootstrapPending = false
  if (hasPendingNativeStateRestore()) {
    root.render(
      <LanguageProvider>
        <NativeRecoveryShell>
          <main className='flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center'>
            <h1 className='text-xl font-semibold'>Finish restoring your wallet</h1>
            <p>Select the same encrypted backup to complete the interrupted restore.</p>
            <NativeStateBackup mode='import' />
          </main>
        </NativeRecoveryShell>
      </LanguageProvider>,
    )
    return
  }
  root.render(
    // <React.StrictMode>
    <DevModeProvider>
      <NavigationProvider>
        <ConfigProvider>
          <LanguageProvider>
            <BackupProvider>
              <AspProvider>
                <AssetsProvider>
                  <NotificationsProvider>
                    <FiatProvider>
                      <FlowProvider>
                        <WalletProvider>
                          <SwapsProvider>
                            <LimitsProvider>
                              <FeesProvider>
                                <OptionsProvider>
                                  <NudgeProvider>
                                    <AnnouncementProvider>
                                      <ToastProvider>
                                        <ErrorBoundary>
                                          <NativeAppShell>
                                            <App />
                                          </NativeAppShell>
                                        </ErrorBoundary>
                                      </ToastProvider>
                                    </AnnouncementProvider>
                                  </NudgeProvider>
                                </OptionsProvider>
                              </FeesProvider>
                            </LimitsProvider>
                          </SwapsProvider>
                        </WalletProvider>
                      </FlowProvider>
                    </FiatProvider>
                  </NotificationsProvider>
                </AssetsProvider>
              </AspProvider>
            </BackupProvider>
          </LanguageProvider>
        </ConfigProvider>
      </NavigationProvider>
    </DevModeProvider>,
    // </React.StrictMode>,
  )
}

void bootstrap()
