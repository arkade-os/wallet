import ReactDOM from 'react-dom/client'
import './index.css'
import './ionic.css'
import App from './App'
// import IconPreview from './screens/IconPreview'
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
import { shouldInitializeSentry } from './lib/sentry'
import { FeesProvider } from './providers/fees'
import { AnnouncementProvider } from './providers/announcements'

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
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/wallet-service-worker.mjs').catch(() => {})
}

// check if there's a service worker controlling the page
const previousSW = navigator.serviceWorker.controller

// This fires when the service worker controlling this page changes,
// eg a new worker has skipped waiting and become the new active worker.
// We reload the page to have the new service worker properly initialized.
navigator.serviceWorker.addEventListener('controllerchange', () => {
  // don't reload on fresh install, only when the service worker changes (eg update)
  if (previousSW) window.location.reload()
})

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  // <React.StrictMode>
  <NavigationProvider>
    <ConfigProvider>
      <AspProvider>
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
                            <App />
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
      </AspProvider>
    </ConfigProvider>
  </NavigationProvider>,
  // </React.StrictMode>,
)
