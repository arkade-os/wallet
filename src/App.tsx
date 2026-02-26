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

import { AnimatePresence } from 'framer-motion'
import { ConfigContext } from './providers/config'
import { IonApp, IonPage, IonTab, IonTabBar, IonTabButton, IonTabs, setupIonicReact } from '@ionic/react'
import { NavigationContext, pageComponent, Pages, Tabs } from './providers/navigation'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { detectJSCapabilities } from './lib/jsCapabilities'
import { OptionsContext } from './providers/options'
import { WalletContext } from './providers/wallet'
import { FlowContext } from './providers/flow'
import { SettingsOptions } from './lib/types'
import { AspContext } from './providers/asp'
import { hapticLight } from './lib/haptics'
import PageTransition from './components/PageTransition'
import SettingsIcon from './icons/Settings'
import Loading from './components/Loading'
import { pwaIsInstalled } from './lib/pwa'
import FlexCol from './components/FlexCol'
import WalletIcon from './icons/Wallet'
import AppsIcon from './icons/Apps'
import Focusable from './components/Focusable'
import { useReducedMotion } from './hooks/useReducedMotion'

setupIonicReact()

import { EASE_SPRING, DUR_STANDARD } from './lib/animations'

function AnimatedTabIcon({
  children,
  animating,
  animKey,
}: {
  children: React.ReactNode
  animating: boolean
  animKey: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!animating || !ref.current || reduced) return
    ref.current.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: DUR_STANDARD, easing: EASE_SPRING, fill: 'forwards' },
    )
  }, [animating, animKey, reduced])

  return (
    <div ref={ref} className='tab-icon-animated'>
      {children}
    </div>
  )
}

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { direction, navigate, screen, tab } = useContext(NavigationContext)
  const { initInfo } = useContext(FlowContext)
  const { setOption } = useContext(OptionsContext)
  const { walletLoaded, initialized, wallet } = useContext(WalletContext)

  const [isCapable, setIsCapable] = useState(false)
  const [jsCapabilitiesChecked, setJsCapabilitiesChecked] = useState(false)
  const [animatingTab, setAnimatingTab] = useState<string | null>(null)
  const animKeyRef = useRef(0)

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
      .then((res) => setIsCapable(res.isSupported))
      .catch(() => setIsCapable(false))
      .finally(() => setJsCapabilitiesChecked(true))
  }, [])

  // Global escape key to go back to wallet
  useEffect(() => {
    if (!navigate) return
    const handleGlobalDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate(Pages.Wallet)
    }
    window.addEventListener('keydown', handleGlobalDown)
    return () => window.removeEventListener('keydown', handleGlobalDown)
  }, [navigate])

  useEffect(() => {
    if (aspInfo.unreachable) return navigate(Pages.Unavailable)
    if (jsCapabilitiesChecked && !isCapable) return navigate(Pages.Unavailable)
    // avoid redirect if the user is still setting up the wallet
    if (initInfo.password || initInfo.privateKey) return
    if (!walletLoaded) return navigate(Pages.Loading)
    if (!wallet.pubkey) return navigate(pwaIsInstalled() ? Pages.Init : Pages.Onboard)
    if (!initialized) return navigate(Pages.Unlock)
  }, [walletLoaded, initialized, initInfo, aspInfo.unreachable, jsCapabilitiesChecked, isCapable])

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

  const triggerTabAnim = useCallback((tabName: string) => {
    animKeyRef.current++
    setAnimatingTab(tabName)
  }, [])

  const handleWallet = () => {
    triggerTabAnim('wallet')
    hapticLight()
    navigate(Pages.Wallet)
  }

  const handleApps = () => {
    triggerTabAnim('apps')
    hapticLight()
    navigate(Pages.Apps)
  }

  const handleSettings = () => {
    triggerTabAnim('settings')
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const prefersReduced = useReducedMotion()
  const effectiveDirection = prefersReduced ? 'none' : direction

  const page =
    jsCapabilitiesChecked && configLoaded && (aspInfo.signerPubkey || aspInfo.unreachable) ? screen : Pages.Loading

  const comp = page === Pages.Loading ? <Loading /> : pageComponent(page)

  return (
    <IonApp>
      <IonPage>
        {tab === Tabs.None ? (
          <div className='page-transition-container'>
            <AnimatePresence mode='sync' initial={false} custom={effectiveDirection}>
              <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                {comp}
              </PageTransition>
            </AnimatePresence>
          </div>
        ) : (
          <IonTabs>
            <IonTab ref={walletRef} tab={Tabs.Wallet}>
              <div className='page-transition-container'>
                <AnimatePresence mode='sync' initial={false} custom={effectiveDirection}>
                  {tab === Tabs.Wallet && (
                    <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                      {comp}
                    </PageTransition>
                  )}
                </AnimatePresence>
              </div>
            </IonTab>
            <IonTab ref={appsRef} tab={Tabs.Apps}>
              <div className='page-transition-container'>
                <AnimatePresence mode='sync' initial={false} custom={effectiveDirection}>
                  {tab === Tabs.Apps && (
                    <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                      {comp}
                    </PageTransition>
                  )}
                </AnimatePresence>
              </div>
            </IonTab>
            <IonTab ref={settingsRef} tab={Tabs.Settings}>
              <div className='page-transition-container'>
                <AnimatePresence mode='sync' initial={false} custom={effectiveDirection}>
                  {tab === Tabs.Settings && (
                    <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                      {comp}
                    </PageTransition>
                  )}
                </AnimatePresence>
              </div>
            </IonTab>
            <IonTabBar slot='bottom'>
              <IonTabButton tab={Tabs.Wallet} onClick={handleWallet} selected={tab === Tabs.Wallet}>
                <Focusable>
                  <FlexCol centered gap='6px' padding='5px' testId='tab-wallet'>
                    <AnimatedTabIcon animating={animatingTab === 'wallet'} animKey={animKeyRef.current}>
                      <WalletIcon />
                    </AnimatedTabIcon>
                    Wallet
                  </FlexCol>
                </Focusable>
              </IonTabButton>
              <IonTabButton tab={Tabs.Apps} onClick={handleApps} selected={tab === Tabs.Apps}>
                <Focusable>
                  <FlexCol centered gap='6px' padding='5px' testId='tab-apps'>
                    <AnimatedTabIcon animating={animatingTab === 'apps'} animKey={animKeyRef.current}>
                      <AppsIcon />
                    </AnimatedTabIcon>
                    Apps
                  </FlexCol>
                </Focusable>
              </IonTabButton>
              <IonTabButton tab={Tabs.Settings} onClick={handleSettings} selected={tab === Tabs.Settings}>
                <Focusable>
                  <FlexCol centered gap='6px' padding='5px' testId='tab-settings'>
                    <AnimatedTabIcon animating={animatingTab === 'settings'} animKey={animKeyRef.current}>
                      <SettingsIcon />
                    </AnimatedTabIcon>
                    Settings
                  </FlexCol>
                </Focusable>
              </IonTabButton>
            </IonTabBar>
          </IonTabs>
        )}
      </IonPage>
    </IonApp>
  )
}
