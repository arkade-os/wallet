import ReactDOM from 'react-dom/client'
import './index.css'
import './ionic.css'
import App from './App'
import { AspProvider } from './providers/asp'
import { ConfigProvider } from './providers/config'
import { FiatProvider } from './providers/fiat'
import { FlowProvider } from './providers/flow'
import { NavigationProvider } from './providers/navigation'
import { NotificationsProvider } from './providers/notifications'
import { WalletProvider } from './providers/wallet'
import { OptionsProvider } from './providers/options'
import { IframeProvider } from './providers/iframe'
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'https://155067b98b323b6e06845b78a4f9adb0@o4508966055313408.ingest.de.sentry.io/4508970382131280',
})

const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const hash = window.location.hash
const possibleUrl = hash.startsWith('#') ? hash.slice(1) : hash
const hasIframe = isValidUrl(possibleUrl)

const AppWithProviders = () => {
  const baseApp = <App />

  return hasIframe ? <IframeProvider>{baseApp}</IframeProvider> : baseApp
}

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
                <OptionsProvider>
                  <AppWithProviders />
                </OptionsProvider>
              </WalletProvider>
            </FlowProvider>
          </FiatProvider>
        </NotificationsProvider>
      </AspProvider>
    </ConfigProvider>
  </NavigationProvider>,
  // </React.StrictMode>,
)
