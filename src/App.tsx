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
import { IonApp, IonPage, IonTab, IonTabs, setupIonicReact } from '@ionic/react'
import { NavigationContext, pageComponent, Pages, Tabs, type NavigationDirection } from './providers/navigation'
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isInAppBrowser } from './lib/browser'
import { detectJSCapabilities } from './lib/jsCapabilities'
import { OptionsContext } from './providers/options'
import { WalletContext } from './providers/wallet'
import { FlowContext } from './providers/flow'
import { SettingsOptions } from './lib/types'
import { AspContext } from './providers/asp'
import { hapticLight } from './lib/haptics'
import { PageTransition } from './components/PageTransition'
import { SettingsIconLight, CloseIcon } from './icons/Settings'
import Loading from './components/Loading'
import PillNavbar from './components/PillNavbar'
import { useReducedMotion } from './hooks/useReducedMotion'

setupIonicReact()

function PageAnimWrapper({
  children,
  animated,
  direction,
}: {
  children: ReactNode
  animated: boolean
  direction: NavigationDirection | 'none'
}) {
  if (!animated) return <>{children}</>
  return (
    <AnimatePresence mode='sync' initial={false} custom={direction}>
      {children}
    </AnimatePresence>
  )
}

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { direction, navigate, screen, tab } = useContext(NavigationContext)
  const { initInfo } = useContext(FlowContext)
  const { option, setOption } = useContext(OptionsContext)
  const { walletLoaded, initialized, wallet } = useContext(WalletContext)

  const isIAB = useMemo(() => isInAppBrowser(), [])
  const [isCapable, setIsCapable] = useState(false)
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
    if (isIAB) return navigate(Pages.InAppBrowser)
    if (aspInfo.unreachable) return navigate(Pages.Unavailable)
    if (jsCapabilitiesChecked && !isCapable) return navigate(Pages.Unavailable)
    // avoid redirect if the user is still setting up the wallet
    if (initInfo.password || initInfo.privateKey) return
    if (!walletLoaded) return navigate(Pages.Loading)
    if (!wallet.pubkey) return navigate(Pages.Init)
    if (!initialized) return navigate(Pages.Unlock)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate is unstable (recreated every render), including it causes an infinite redirect loop
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

  const handleWallet = () => {
    hapticLight()
    navigate(Pages.Wallet)
  }

  const handleApps = () => {
    hapticLight()
    navigate(Pages.Apps)
  }

  const handleSettings = () => {
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const prefersReduced = useReducedMotion()
  const effectiveDirection = prefersReduced ? 'none' : direction

  const handleCloseSettings = () => {
    hapticLight()
    navigate(Pages.Wallet)
  }

  // New users (no wallet in storage) skip straight to Init — the logo morph animation
  // serves as the intro visual while ASP and JS capability checks resolve in the background.
  // Init doesn't need ASP or crypto until "Create wallet" is clicked.
  const aspReady = aspInfo.signerPubkey || aspInfo.unreachable
  const isNewUser = walletLoaded && !wallet.pubkey
  const allChecksReady = jsCapabilitiesChecked && configLoaded && aspReady
  const page = allChecksReady || isNewUser ? screen : Pages.Loading

  const comp = page === Pages.Loading ? <Loading /> : pageComponent(page)

  return (
    <IonApp>
      <IonPage>
        {tab === Tabs.None ? (
          <div className='page-transition-container'>
            <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
              <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                {comp}
              </PageTransition>
            </PageAnimWrapper>
          </div>
        ) : (
          <>
            <button
              className='header-settings-btn'
              data-testid='tab-settings'
              onClick={tab === Tabs.Settings && option === SettingsOptions.Menu ? handleCloseSettings : handleSettings}
              aria-label={tab === Tabs.Settings && option === SettingsOptions.Menu ? 'Close settings' : 'Settings'}
              style={
                page !== Pages.Wallet &&
                page !== Pages.Apps &&
                (tab !== Tabs.Settings || option !== SettingsOptions.Menu)
                  ? { display: 'none' }
                  : undefined
              }
            >
              <span className={`header-icon-morph ${tab === Tabs.Settings ? 'header-icon-morph--close' : ''}`}>
                <span className='header-icon-gear'>
                  <SettingsIconLight />
                </span>
                <span className='header-icon-x'>
                  <CloseIcon />
                </span>
              </span>
            </button>
            {tab !== Tabs.Settings ? (
              <>
                <div className='pill-navbar-fade' />
                <PillNavbar activeTab={tab} onWalletClick={handleWallet} onAppsClick={handleApps} />
              </>
            ) : null}
            <IonTabs>
              <IonTab ref={walletRef} tab={Tabs.Wallet}>
                <div className='page-transition-container'>
                  <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
                    {tab === Tabs.Wallet ? (
                      <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                        {comp}
                      </PageTransition>
                    ) : null}
                  </PageAnimWrapper>
                </div>
              </IonTab>
              <IonTab ref={appsRef} tab={Tabs.Apps}>
                <div className='page-transition-container'>
                  <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
                    {tab === Tabs.Apps ? (
                      <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                        {comp}
                      </PageTransition>
                    ) : null}
                  </PageAnimWrapper>
                </div>
              </IonTab>
              <IonTab ref={settingsRef} tab={Tabs.Settings}>
                <div className='page-transition-container'>
                  <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
                    {tab === Tabs.Settings ? (
                      <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                        {comp}
                      </PageTransition>
                    ) : null}
                  </PageAnimWrapper>
                </div>
              </IonTab>
            </IonTabs>
          </>
        )}
      </IonPage>
    </IonApp>
  )
}
