import ReactDOM from 'react-dom/client'
import './tokens.css'
import './app.css'
import './index.css'
import App from './App'
import { Toaster } from 'sonner'
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
  })
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
                            <Toaster
                              position='top-center'
                              duration={1500}
                              toastOptions={{
                                style: {
                                  background: 'var(--fg)',
                                  color: 'var(--bg)',
                                  borderRadius: '0.5rem',
                                  border: 'none',
                                  textAlign: 'center',
                                  maxWidth: '260px',
                                  padding: '0.75rem 1rem',
                                  fontSize: '0.875rem',
                                  justifyContent: 'center',
                                },
                              }}
                            />
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
