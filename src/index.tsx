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
  })
}

// refresh the page when the service worker is updated, so that the new service
// worker can take control of the page and serve the updated wallet sdk
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data?.type === 'SW_INSTALLED') window.location.reload()
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
