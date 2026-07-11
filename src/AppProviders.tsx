import App from './App'
import { AspProvider } from './providers/asp'
import { AssetsProvider } from './providers/assets'
import { ConfigProvider } from './providers/config'
import { FiatProvider } from './providers/fiat'
import { FlowProvider } from './providers/flow'
import { NavigationProvider } from './providers/navigation'
import { NotificationsProvider } from './providers/notifications'
import { WalletProvider } from './providers/wallet'
import { OptionsProvider } from './providers/options'
import { LimitsProvider } from './providers/limits'
import { NudgeProvider } from './providers/nudge'
import { SwapsProvider } from './providers/swaps'
import { LnurlProvider } from './providers/lnurl'
import { FeesProvider } from './providers/fees'
import { AnnouncementProvider } from './providers/announcements'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { DevModeProvider } from './providers/devMode'

/**
 * Shared app tree rendered by both the PWA and Capacitor app shells.
 *
 * The shell wrapping this component provides runtime services (service worker,
 * native plugins, capabilities) via `RuntimeContext`; everything below is the
 * same regardless of runtime.
 */
export default function AppProviders() {
  return (
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
            </AssetsProvider>
          </AspProvider>
        </ConfigProvider>
      </NavigationProvider>
    </DevModeProvider>
  )
}
