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
import { WalletContext } from './providers/wallet'

import { IonApp, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact, useIonToast } from '@ionic/react'
import HomeIcon from './icons/Home'
import ReceiveIcon from './icons/Receive'
import SettingsIcon from './icons/Settings'
import SendIcon from './icons/Send'
import { OptionsContext } from './providers/options'
import { emptyRecvInfo, emptySendInfo, FlowContext } from './providers/flow'
import { AspContext } from './providers/asp'
import { SettingsOptions } from './lib/types'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'
import { newVersionAvailable } from './lib/toast'
import { IframeContext } from './providers/iframe'
import Loading from './components/Loading'

setupIonicReact()

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate, screen, tab } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const { reloadWallet } = useContext(WalletContext)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  const [present] = useIonToast()

  useEffect(() => {
    if (!configLoaded) {
      setLoadingError(null)
    }
  }, [configLoaded])

  useEffect(() => {
    if (aspInfo.unreachable) {
      setLoadingError('Unable to connect to the server. Please check your internet connection and try again.')
    }
  }, [aspInfo.unreachable])

  useEffect(() => {
    console.log('registering service worker')
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

  const handleHome = () => {
    reloadWallet()
    navigate(Pages.Wallet)
  }

  const handleSend = () => {
    reloadWallet()
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    reloadWallet()
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveAmount)
  }

  const handleSettings = () => {
    reloadWallet()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const page = configLoaded && (aspInfo.pubkey || aspInfo.unreachable) ? screen : Pages.Loading

  const comp = page === Pages.Loading ? (
    <Loading text={loadingError || undefined} />
  ) : (
    pageComponent(page)
  )

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
            <IonTab tab={Tabs.Home}>{comp}</IonTab>
            <IonTab tab={Tabs.Send}>{comp}</IonTab>
            <IonTab tab={Tabs.Receive}>{comp}</IonTab>
            <IonTab tab={Tabs.Settings}>{comp}</IonTab>
            <IonTabBar slot='bottom'>
              <IonTabButton tab={Tabs.Home} selected={tab === Tabs.Home} onClick={handleHome}>
                <HomeIcon />
                Home
              </IonTabButton>
              <IonTabButton tab={Tabs.Send} selected={tab === Tabs.Send} onClick={handleSend}>
                <SendIcon />
                Send
              </IonTabButton>
              <IonTabButton tab={Tabs.Receive} selected={tab === Tabs.Receive} onClick={handleReceive}>
                <ReceiveIcon />
                Receive
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
