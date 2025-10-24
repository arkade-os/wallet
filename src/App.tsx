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

import { ConfigContext } from './providers/config'
import { IonApp, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from '@ionic/react'
import { NavigationContext, pageComponent, Pages, Tabs } from './providers/navigation'
import { useContext, useEffect, useRef, useState } from 'react'
import { OptionsContext } from './providers/options'
import { WalletContext } from './providers/wallet'
import { FlowContext } from './providers/flow'
import { SettingsOptions } from './lib/types'
import { AspContext } from './providers/asp'
import SettingsIcon from './icons/Settings'
import Loading from './components/Loading'
import { pwaIsInstalled } from './lib/pwa'
import WalletIcon from './icons/Wallet'
import AppsIcon from './icons/Apps'
import FlexCol from './components/FlexCol'
import { detectJSCapabilities, getRestrictedEnvironmentMessage } from './lib/jsCapabilities'
import { isIOS } from './lib/browser'

setupIonicReact()

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { navigate, screen, tab } = useContext(NavigationContext)
  const { initInfo } = useContext(FlowContext)
  const { setOption } = useContext(OptionsContext)
  const { walletLoaded, initialized, svcWallet, wallet } = useContext(WalletContext)

  const [loadingError, setLoadingError] = useState('')
  const [jsCapabilitiesChecked, setJsCapabilitiesChecked] = useState(false)

  // refs for the tabs to be able to programmatically activate them
  const appsRef = useRef<HTMLIonTabElement>(null)
  const walletRef = useRef<HTMLIonTabElement>(null)
  const settingsRef = useRef<HTMLIonTabElement>(null)

  // lock screen orientation to portrait
  // this is a workaround for the issue with the screen orientation API
  // not being supported in some browsers
  const orientation = window.screen.orientation as any
  if (orientation && typeof orientation.lock === 'function') {
    orientation.lock('portrait').catch(() => {})
  }

  // Check JavaScript capabilities on mount
  useEffect(() => {
    detectJSCapabilities()
      .then((result) => {
        if (!result.isSupported) {
          // Use specific error message or fallback to iOS/generic message
          const errorMsg = result.errorMessage || getRestrictedEnvironmentMessage(isIOS())
          setLoadingError(errorMsg)
        }
        setJsCapabilitiesChecked(true)
      })
      .catch(() => {
        setLoadingError(getRestrictedEnvironmentMessage(isIOS()))
        setJsCapabilitiesChecked(true)
      })
  }, [])

  useEffect(() => {
    if (!configLoaded) {
      setLoadingError('')
    }
  }, [configLoaded])

  useEffect(() => {
    if (aspInfo.unreachable) {
      setLoadingError('Unable to connect to the server. Please check your internet connection and try again.')
    }
  }, [aspInfo.unreachable])

  useEffect(() => {
    // avoid redirect if the user is still setting up the wallet
    if (initInfo.password || initInfo.privateKey) return
    if (!walletLoaded) return navigate(Pages.Loading)
    if (!wallet.pubkey) return navigate(pwaIsInstalled() ? Pages.Init : Pages.Onboard)
    if (!initialized) return navigate(Pages.Unlock)
  }, [walletLoaded, initialized, svcWallet, initInfo])

  // for some reason you need to manually set the active tab
  // if you are coming from a page in a different tab
  useEffect(() => {
    switch (tab) {
      case Tabs.Wallet:
        walletRef.current?.setActive()
        walletRef.current?.classList.remove('tab-hidden')
        appsRef.current?.classList.add('tab-hidden')
        settingsRef.current?.classList.add('tab-hidden')
        break
      case Tabs.Apps:
        appsRef.current?.setActive()
        appsRef.current?.classList.remove('tab-hidden')
        walletRef.current?.classList.add('tab-hidden')
        settingsRef.current?.classList.add('tab-hidden')
        break
      case Tabs.Settings:
        settingsRef.current?.setActive()
        settingsRef.current?.classList.remove('tab-hidden')
        walletRef.current?.classList.add('tab-hidden')
        appsRef.current?.classList.add('tab-hidden')
        break
      default:
        break
    }
  }, [tab])

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

  const page = jsCapabilitiesChecked && configLoaded && (aspInfo.signerPubkey || aspInfo.unreachable) ? screen : Pages.Loading

  const comp = page === Pages.Loading ? <Loading text={loadingError} /> : pageComponent(page)

  return (
    <IonApp>
      <IonPage>
        {tab === Tabs.None ? (
          comp
        ) : (
          <IonTabs>
            <IonTab ref={walletRef} tab={Tabs.Wallet}>
              {tab === Tabs.Wallet ? comp : <></>}
            </IonTab>
            <IonTab ref={appsRef} tab={Tabs.Apps}>
              {tab === Tabs.Apps ? comp : <></>}
            </IonTab>
            <IonTab ref={settingsRef} tab={Tabs.Settings}>
              {tab === Tabs.Settings ? comp : <></>}
            </IonTab>
            <IonTabBar slot='bottom'>
              <IonTabButton tab={Tabs.Wallet} selected={tab === Tabs.Wallet} onClick={handleWallet}>
                <FlexCol centered gap='6px'>
                  <WalletIcon />
                  Wallet
                </FlexCol>
              </IonTabButton>
              <IonTabButton tab={Tabs.Apps} selected={tab === Tabs.Apps} onClick={handleApps}>
                <FlexCol centered gap='6px'>
                  <AppsIcon />
                  Apps
                </FlexCol>
              </IonTabButton>
              <IonTabButton tab={Tabs.Settings} selected={tab === Tabs.Settings} onClick={handleSettings}>
                <FlexCol centered gap='6px'>
                  <SettingsIcon />
                  Settings
                </FlexCol>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        )}
      </IonPage>
    </IonApp>
  )
}
