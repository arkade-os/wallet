import '@ionic/react/css/core.css'
/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

import '@ionic/react/css/palettes/dark.class.css'

import { useContext, useEffect, useState } from 'react'
import { ConfigContext } from './providers/config'
import { NavigationContext, pageComponent, Pages, Tabs } from './providers/navigation'

import { IonApp, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from '@ionic/react'
import HomeIcon from './icons/Home'
import SettingsIcon from './icons/Settings'
import { OptionsContext } from './providers/options'
import { AspContext } from './providers/asp'
import { SettingsOptions } from './lib/types'
import { IframeContext } from './providers/iframe'
import Loading from './components/Loading'
import AppsIcon from './icons/Apps'
import { WalletContext } from './providers/wallet'

setupIonicReact()

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate, screen, tab } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const { wallet } = useContext(WalletContext)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  useEffect(() => {
    if (!configLoaded) {
      setLoadingError(null)
    }
  }, [configLoaded])

  useEffect(() => {
    if (aspInfo.unreachable) {
      setLoadingError('Unable t connect to the server. Please check your internet connection and try again.')
    }
  }, [aspInfo.unreachable])

  useEffect(() => {
    if (!wallet.initialized) {
      if (wallet.network === '') navigate(Pages.Onboard)
      else navigate(Pages.Unlock)
    } else {
      navigate(Pages.Wallet)
    }
  }, [wallet.initialized])

  const handleWallet = () => {
    navigate(Pages.Wallet)
  }

  const handleApps = () => {
    navigate(Pages.Apps)
  }

  const handleSettings = () => {
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const page = configLoaded && (aspInfo.pubkey || aspInfo.unreachable) ? screen : Pages.Loading

  const comp = page === Pages.Loading ? <Loading text={loadingError || undefined} /> : pageComponent(page)

  if (iframeUrl)
    return (
      <>
        {comp}
        <iframe src={iframeUrl} />
      </>
    )

  return (
    <IonApp>
      <IonPage>
        {tab === Tabs.None ? (
          comp
        ) : (
          <IonTabs>
            <IonTab tab={Tabs.Wallet}>{comp}</IonTab>
            <IonTab tab={Tabs.Apps}>{comp}</IonTab>
            <IonTab tab={Tabs.Settings}>{comp}</IonTab>
            <IonTabBar slot='bottom'>
              <IonTabButton tab={Tabs.Wallet} selected={tab === Tabs.Wallet} onClick={handleWallet}>
                <HomeIcon />
                Home
              </IonTabButton>
              <IonTabButton tab={Tabs.Apps} selected={tab === Tabs.Apps} onClick={handleApps}>
                <AppsIcon />
                Apps
              </IonTabButton>
              <IonTabButton tab={Tabs.Settings} selected={tab === Tabs.Settings} onClick={handleSettings}>
                <SettingsIcon />
                Settings
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        )}
      </IonPage>
    </IonApp>
  )
}
