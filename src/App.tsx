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

import { useContext, useEffect } from 'react'
import { ConfigContext } from './providers/config'
import { NavigationContext, pageComponent, Pages, Tabs } from './providers/navigation'
import { WalletContext } from './providers/wallet'

import './wasm_exec.js'
import './wasmTypes.d.ts'

import { IonApp, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact, useIonToast } from '@ionic/react'
import HomeIcon from './icons/Home'
import SettingsIcon from './icons/Settings'
import { OptionsContext } from './providers/options'
import { AspContext } from './providers/asp'
import { SettingsOptions } from './lib/types'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'
import { newVersionAvailable } from './lib/toast'
import { IframeContext } from './providers/iframe'
import AppsIcon from './icons/Apps'

setupIonicReact()

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate, screen, tab } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const { reloadWallet, wasmLoaded } = useContext(WalletContext)

  const [present] = useIonToast()

  useEffect(() => {
    serviceWorkerRegistration.register({
      onUpdate: () => {
        present(newVersionAvailable)
      },
    })
  }, [])

  useEffect(() => {
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) registration.update()
      })
    }, 1000 * 60 * 60)
  }, [])

  const handleWallet = () => {
    reloadWallet()
    navigate(Pages.Wallet)
  }

  const handleApps = () => {
    reloadWallet()
    navigate(Pages.Apps)
  }

  const handleSettings = () => {
    reloadWallet()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const page = configLoaded && wasmLoaded && (aspInfo.pubkey || aspInfo.unreachable) ? screen : Pages.Loading

  const comp = pageComponent(page)

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
