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
import { setBootAnimActive as syncBootAnimFlag } from './lib/logoAnchor'
import { PageTransition } from './components/PageTransition'
import SettingsIcon from './icons/Settings'
import LoadingLogo from './components/LoadingLogo'
import PillNavbarOverlay from './components/PillNavbarOverlay'
import FlexCol from './components/FlexCol'
import WalletIcon from './icons/Wallet'
import AppsIcon from './icons/Apps'
import Focusable from './components/Focusable'
import { useReducedMotion } from './hooks/useReducedMotion'
import { defaultPassword } from './lib/constants'
import { consoleError } from './lib/logs'

setupIonicReact()

const PASSWORDLESS_AUTO_RELOAD_KEY = 'passwordless-auto-reload-attempted'
export const appReloader = {
  reload: () => window.location.reload(),
}

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

const animClass = 'tab-anim-pop'

function AnimatedTabIcon({ children, animating }: { children: React.ReactNode; animating: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animating || !ref.current) return
    const el = ref.current
    el.classList.remove(animClass)
    void el.offsetWidth // Force reflow so removing + re-adding the class triggers the animation
    el.classList.add(animClass)
    const handleEnd = () => el.classList.remove(animClass)
    el.addEventListener('animationend', handleEnd)
    return () => el.removeEventListener('animationend', handleEnd)
  }, [animating])

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
  const { authState, unlockWallet, walletLoaded, initialized, wallet } = useContext(WalletContext)

  const isIAB = useMemo(() => isInAppBrowser(), [])
  const [isCapable, setIsCapable] = useState(false)
  const [jsCapabilitiesChecked, setJsCapabilitiesChecked] = useState(false)
  const [animatingTab, setAnimatingTab] = useState<string | null>(null)
  const [bootAnimActive, setBootAnimActive] = useState(false)
  const updateBootAnimActive = useCallback((active: boolean) => {
    syncBootAnimFlag(active) // sync external store before React re-render
    setBootAnimActive(active)
  }, [])
  const [bootAnimDone, setBootAnimDone] = useState(false)
  const [bootExitMode, setBootExitMode] = useState<'fly-to-target' | 'fly-up'>('fly-up')

  // refs for the tabs to be able to programmatically activate them
  const appsRef = useRef<HTMLIonTabElement>(null)
  const walletRef = useRef<HTMLIonTabElement>(null)
  const settingsRef = useRef<HTMLIonTabElement>(null)
  const passwordlessBootAttempted = useRef(false)
  const passwordlessReloadTimer = useRef<ReturnType<typeof setTimeout>>()

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
    // dev auto-init: stay on loading screen while VITE_DEV_NSEC initializes the wallet
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_NSEC && !initialized) return
    if (!wallet.pubkey) return navigate(Pages.Init)
    if (authState === 'locked') return navigate(Pages.Unlock)
  }, [walletLoaded, wallet.pubkey, authState, initInfo, aspInfo.unreachable, jsCapabilitiesChecked, isCapable])

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
    setAnimatingTab(null)
    requestAnimationFrame(() => setAnimatingTab(tabName))
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

  // New users (no wallet in storage) skip straight to Init — the logo morph animation
  // serves as the intro visual while ASP and JS capability checks resolve in the background.
  // Init doesn't need ASP or crypto until "Create wallet" is clicked.
  const aspReady = aspInfo.signerPubkey || aspInfo.unreachable
  const isNewUser = walletLoaded && !wallet.pubkey
  const allChecksReady = jsCapabilitiesChecked && configLoaded && aspReady
  const hasStoredWallet = walletLoaded && !!wallet.pubkey
  const shouldShowUnlock = hasStoredWallet && authState === 'locked'
  const shouldHoldOnLoading = hasStoredWallet && !initialized && authState !== 'locked'

  useEffect(() => {
    passwordlessBootAttempted.current = false
  }, [wallet.pubkey, authState])

  useEffect(() => {
    return () => {
      if (passwordlessReloadTimer.current) clearTimeout(passwordlessReloadTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!allChecksReady) return
    if (!wallet.pubkey || initialized) return
    if (authState !== 'passwordless') return
    if (passwordlessBootAttempted.current) return

    passwordlessBootAttempted.current = true
    unlockWallet(defaultPassword).catch((err) => {
      consoleError(err, 'error auto-initializing passwordless wallet')
      try {
        if (sessionStorage.getItem(PASSWORDLESS_AUTO_RELOAD_KEY)) return
        sessionStorage.setItem(PASSWORDLESS_AUTO_RELOAD_KEY, 'true')
        passwordlessReloadTimer.current = setTimeout(() => appReloader.reload(), 1_000)
      } catch {
        // ignore session storage errors; keep the app on loading instead of retry-looping
      }
    })
  }, [allChecksReady, wallet.pubkey, initialized, authState, unlockWallet])

  const page = !(allChecksReady || isNewUser)
    ? Pages.Loading
    : shouldHoldOnLoading
      ? Pages.Loading
      : shouldShowUnlock
        ? Pages.Unlock
        : screen

  // Boot animation: persists from Loading through Unlock until Wallet is reached,
  // then flies to the LogoIcon position. For new users (→ Init), exits with fly-up.
  useEffect(() => {
    // Start boot animation when we first see the Loading page
    if (page === Pages.Loading && !bootAnimActive) {
      updateBootAnimActive(true)
      return
    }

    if (!bootAnimActive || bootAnimDone) return

    // When we reach Wallet, fly to the logo target
    if (page === Pages.Wallet) {
      setBootExitMode('fly-to-target')
      setBootAnimDone(true)
      return
    }

    // If we land on Init (new user) or any non-boot page, fly up and exit
    if (page !== Pages.Loading && page !== Pages.Unlock) {
      setBootExitMode('fly-up')
      setBootAnimDone(true)
    }
  }, [page, bootAnimActive, bootAnimDone])

  const handleBootAnimComplete = useCallback(() => {
    updateBootAnimActive(false)
  }, [updateBootAnimActive])

  const comp = page === Pages.Loading ? null : pageComponent(page)

  return (
    <IonApp className={tab !== Tabs.None ? 'has-pill-navbar' : undefined}>
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
            <IonTabs>
              <IonTab ref={walletRef} tab={Tabs.Wallet}>
                <div className='page-transition-container'>
                  <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
                    {tab === Tabs.Wallet && (
                      <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                        {comp}
                      </PageTransition>
                    )}
                  </PageAnimWrapper>
                </div>
              </IonTab>
              <IonTab ref={appsRef} tab={Tabs.Apps}>
                <div className='page-transition-container'>
                  <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
                    {tab === Tabs.Apps && (
                      <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                        {comp}
                      </PageTransition>
                    )}
                  </PageAnimWrapper>
                </div>
              </IonTab>
              <IonTab ref={settingsRef} tab={Tabs.Settings}>
                <div className='page-transition-container'>
                  <PageAnimWrapper animated={!prefersReduced} direction={effectiveDirection}>
                    {tab === Tabs.Settings && (
                      <PageTransition key={String(page)} direction={direction} pageKey={String(page)}>
                        {comp}
                      </PageTransition>
                    )}
                  </PageAnimWrapper>
                </div>
              </IonTab>
              <IonTabBar slot='bottom'>
                <IonTabButton tab={Tabs.Wallet} onClick={handleWallet} selected={tab === Tabs.Wallet}>
                  <Focusable>
                    <FlexCol centered gap='6px' padding='5px'>
                      <AnimatedTabIcon animating={animatingTab === 'wallet'}>
                        <WalletIcon />
                      </AnimatedTabIcon>
                      Wallet
                    </FlexCol>
                  </Focusable>
                </IonTabButton>
                <IonTabButton tab={Tabs.Apps} onClick={handleApps} selected={tab === Tabs.Apps}>
                  <Focusable>
                    <FlexCol centered gap='6px' padding='5px'>
                      <AnimatedTabIcon animating={animatingTab === 'apps'}>
                        <AppsIcon />
                      </AnimatedTabIcon>
                      Apps
                    </FlexCol>
                  </Focusable>
                </IonTabButton>
                <IonTabButton tab={Tabs.Settings} onClick={handleSettings} selected={tab === Tabs.Settings}>
                  <Focusable>
                    <FlexCol centered gap='6px' padding='5px'>
                      <AnimatedTabIcon animating={animatingTab === 'settings'}>
                        <SettingsIcon />
                      </AnimatedTabIcon>
                      Settings
                    </FlexCol>
                  </Focusable>
                </IonTabButton>
              </IonTabBar>
            </IonTabs>
          </>
        )}
      </IonPage>
      {tab !== Tabs.None && !bootAnimActive && (
        <PillNavbarOverlay
          activeTab={tab}
          onWalletClick={handleWallet}
          onAppsClick={handleApps}
          onSettingsClick={handleSettings}
        />
      )}
      {bootAnimActive ? (
        <LoadingLogo exitMode={bootExitMode} done={bootAnimDone} onExitComplete={handleBootAnimComplete} />
      ) : null}
    </IonApp>
  )
}
