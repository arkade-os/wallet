import { AnimatePresence } from 'framer-motion'
import { ConfigContext } from './providers/config'
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
import BootError from './components/BootError'
import LoadingLogo from './components/LoadingLogo'
import PillNavbarOverlay from './components/PillNavbarOverlay'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useLoadingStatus } from './hooks/useLoadingStatus'
import { defaultPassword } from './lib/constants'
import { consoleError } from './lib/logs'

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

export default function App() {
  const { aspInfo } = useContext(AspContext)
  const { configLoaded } = useContext(ConfigContext)
  const { direction, navigate, screen, tab } = useContext(NavigationContext)
  const { initInfo } = useContext(FlowContext)
  const { option, setOption } = useContext(OptionsContext)
  const { authState, unlockWallet, walletLoaded, initialized, wallet, dataReady, loadError } = useContext(WalletContext)

  const loadingStatus = useLoadingStatus()
  const isIAB = useMemo(() => isInAppBrowser(), [])
  const [isCapable, setIsCapable] = useState(false)
  const [jsCapabilitiesChecked, setJsCapabilitiesChecked] = useState(false)
  const [bootAnimActive, setBootAnimActive] = useState(false)
  // Syncs the external store before React re-renders, so Wallet reads
  // the correct value on the same frame LoadingLogo unmounts.
  const updateBootAnim = useCallback((active: boolean) => {
    syncBootAnimFlag(active)
    setBootAnimActive(active)
  }, [])
  const [bootAnimDone, setBootAnimDone] = useState(false)
  const [bootExitMode, setBootExitMode] = useState<'fly-to-target' | 'fly-up'>('fly-up')

  // Refs for tab divs to toggle visibility
  const walletRef = useRef<HTMLDivElement>(null)
  const appsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  // Track each tab's last-shown page for keep-alive (inactive tabs stay mounted)
  const tabPages = useRef<Record<string, Pages>>({
    [Tabs.Wallet]: Pages.Wallet,
    [Tabs.Apps]: Pages.Apps,
    [Tabs.Settings]: Pages.Settings,
  })
  const passwordlessBootAttempted = useRef(false)
  const passwordlessReloadTimer = useRef<ReturnType<typeof setTimeout>>()

  // lock screen orientation to portrait
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

  // Toggle tab visibility via CSS classes (single-stack navigation model)
  useEffect(() => {
    const refs = { [Tabs.Wallet]: walletRef, [Tabs.Apps]: appsRef, [Tabs.Settings]: settingsRef }
    for (const [t, ref] of Object.entries(refs)) {
      if (!ref.current) continue
      if (t === tab) ref.current.classList.remove('tab-hidden')
      else ref.current.classList.add('tab-hidden')
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

  // New users skip straight to Init
  const aspReady = aspInfo.signerPubkey || aspInfo.unreachable
  const isNewUser = walletLoaded && !wallet.pubkey
  const allChecksReady = jsCapabilitiesChecked && configLoaded && aspReady
  const hasStoredWallet = walletLoaded && !!wallet.pubkey
  const shouldShowUnlock = hasStoredWallet && authState === 'locked'
  // Hold the loading screen during boot until wallet data is ready.
  // Skip during the init/connect flow (creating or restoring a wallet) so the
  // Connect component stays mounted and can run swap recovery before navigating.
  const isInInitFlow = !!(initInfo.password || initInfo.privateKey)
  const shouldHoldOnLoading = hasStoredWallet && (!initialized || !dataReady) && authState !== 'locked' && !isInInitFlow

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

  // Update the active tab's last-shown page for keep-alive (for tab-switch restore).
  // This also has to run during render — otherwise the render below reads a stale
  // ref on the SAME commit that `page` changed, and the new page doesn't appear
  // until some unrelated state update forces another render. The effect alone can't
  // fix that: effects run after commit, ref mutations don't trigger re-renders.
  if (tab !== Tabs.None) {
    tabPages.current[tab] = page
  }

  // Pages to render per tab: current `page` for the active tab (fresh every render),
  // last-known page for inactive tabs (preserved across tab switches).
  const walletTabPage = tab === Tabs.Wallet ? page : tabPages.current[Tabs.Wallet]
  const appsTabPage = tab === Tabs.Apps ? page : tabPages.current[Tabs.Apps]
  const settingsTabPage = tab === Tabs.Settings ? page : tabPages.current[Tabs.Settings]

  // Boot animation: persists on Loading, then flies to the LogoIcon position when
  // Wallet is reached. For any other destination (Unlock, Init, etc.), exits with fly-up.
  // Skip in dev with VITE_DEV_NSEC — the fast auto-init races with the animation.
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_NSEC) return

    if (page === Pages.Loading && !bootAnimActive) {
      setBootAnimDone(false)
      setBootExitMode('fly-up')
      updateBootAnim(true)
      return
    }

    if (!bootAnimActive || bootAnimDone) return

    if (page === Pages.Wallet) {
      setBootExitMode('fly-to-target')
      setBootAnimDone(true)
      return
    }

    if (page !== Pages.Loading) {
      setBootExitMode('fly-up')
      setBootAnimDone(true)
    }
  }, [page, bootAnimActive, bootAnimDone])

  const handleBootAnimComplete = useCallback(() => {
    updateBootAnim(false)
  }, [updateBootAnim])

  const comp = page === Pages.Loading ? null : pageComponent(page)
  const isSettingsRoot = screen === Pages.Settings && option === SettingsOptions.Menu
  const showNavbar = page === screen && (screen === Pages.Wallet || screen === Pages.Apps || isSettingsRoot)

  const appStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxWidth: '640px',
    margin: '0 auto',
    overflow: 'hidden',
    paddingTop: 'env(safe-area-inset-top)',
    position: 'relative',
  }

  return (
    <div data-testid='app-shell' className={showNavbar ? 'has-pill-navbar' : undefined} style={appStyle}>
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
          <div ref={walletRef} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className='page-transition-container'>
              <PageAnimWrapper
                animated={tab === Tabs.Wallet && !prefersReduced}
                direction={tab === Tabs.Wallet ? effectiveDirection : 'none'}
              >
                <PageTransition key={String(walletTabPage)} direction={direction} pageKey={String(walletTabPage)}>
                  {pageComponent(walletTabPage)}
                </PageTransition>
              </PageAnimWrapper>
            </div>
          </div>
          <div ref={appsRef} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className='page-transition-container'>
              <PageAnimWrapper
                animated={tab === Tabs.Apps && !prefersReduced}
                direction={tab === Tabs.Apps ? effectiveDirection : 'none'}
              >
                <PageTransition key={String(appsTabPage)} direction={direction} pageKey={String(appsTabPage)}>
                  {pageComponent(appsTabPage)}
                </PageTransition>
              </PageAnimWrapper>
            </div>
          </div>
          <div ref={settingsRef} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className='page-transition-container'>
              <PageAnimWrapper
                animated={tab === Tabs.Settings && !prefersReduced}
                direction={tab === Tabs.Settings ? effectiveDirection : 'none'}
              >
                <PageTransition key={String(settingsTabPage)} direction={direction} pageKey={String(settingsTabPage)}>
                  {pageComponent(settingsTabPage)}
                </PageTransition>
              </PageAnimWrapper>
            </div>
          </div>
        </>
      )}
      {tab !== Tabs.None && !bootAnimActive && (
        <PillNavbarOverlay
          visible={showNavbar}
          activeTab={tab}
          onWalletClick={handleWallet}
          onAppsClick={handleApps}
          onSettingsClick={handleSettings}
        />
      )}
      {bootAnimActive ? (
        loadError ? (
          <BootError />
        ) : (
          <LoadingLogo
            text={loadingStatus}
            exitMode={bootExitMode}
            done={bootAnimDone}
            onExitComplete={handleBootAnimComplete}
          />
        )
      ) : null}
    </div>
  )
}
