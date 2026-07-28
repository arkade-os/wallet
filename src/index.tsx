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
import { AssetSwapsProvider } from './providers/assetSwaps'
import { LnurlProvider } from './providers/lnurl'
import { shouldInitializeSentry } from './lib/sentry'
import { FeesProvider } from './providers/fees'
import { AnnouncementProvider } from './providers/announcements'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { DevModeProvider } from './providers/devMode'
import { AssetsProvider } from './providers/assets'

// Register service worker updatefound listener to reload the page when a new service worker
// is found thus preventing some nasty race conditions when updating the service worker.
navigator.serviceWorker?.getRegistration().then((reg) => {
  reg?.addEventListener('updatefound', () => {
    console.log('Service worker update found')
    window.location.reload()
  })
})

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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  // <React.StrictMode>
  <DevModeProvider>
    <NavigationProvider>
      <ConfigProvider>
        <AspProvider>
          <AssetsProvider>
            <NotificationsProvider>
              <FiatProvider>
                <FlowProvider>
                  <WalletProvider>
                    <SwapsProvider>
                      <AssetSwapsProvider>
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
                      </AssetSwapsProvider>
                    </SwapsProvider>
                  </WalletProvider>
                </FlowProvider>
              </FiatProvider>
            </NotificationsProvider>
          </AssetsProvider>
        </AspProvider>
      </ConfigProvider>
    </NavigationProvider>
  </DevModeProvider>,
  // </React.StrictMode>,
)
