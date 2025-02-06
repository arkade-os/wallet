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

import { useContext } from 'react'
import { ConfigContext } from './providers/config'
import { NavigationContext, pageComponent, Pages, Tabs } from './providers/navigation'
import { WalletContext } from './providers/wallet'

import './wasm_exec.js'
import './wasmTypes.d.ts'

import { IonApp, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from '@ionic/react'
import HomeIcon from './icons/Home'
import ReceiveIcon from './icons/Receive'
import SettingsIcon from './icons/Settings'
import SendIcon from './icons/Send'
import { OptionsContext } from './providers/options'
import { emptyRecvInfo, emptySendInfo, FlowContext } from './providers/flow'
import { AspContext } from './providers/asp'
import { SettingsOptions } from './lib/types'

setupIonicReact()

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { navigate, screen, tab } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const { reloadWallet, wasmLoaded } = useContext(WalletContext)

  const handleHome = () => {
    reloadWallet()
    navigate(Pages.Wallet)
  }

  const handleSend = () => {
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  const handleReceive = () => {
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveAmount)
  }

  const handleSettings = () => {
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const page = configLoaded && wasmLoaded && (aspInfo.pubkey || aspInfo.unreachable) ? screen : Pages.Loading

  const comp = pageComponent(page)

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
