import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import DismissibleBanner from '../../components/DismissibleBanner'
import ErrorMessage from '../../components/Error'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import HomeIcon from '../../icons/Home'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { NudgeContext } from '../../providers/nudge'
import { InfoBox } from '../../components/AlertBox'
import { psaMessage } from '../../lib/constants'
import { AnnouncementContext } from '../../providers/announcements'
import { WalletStaggerContainer } from '../../components/WalletLoadIn'
import { pwaCanInstall, usePwaInstalled, canPromptInstall, promptPwaInstall } from '../../lib/pwa'
import { isIOS, isAndroid } from '../../lib/browser'
import { setLogoAnchor, getBootAnimActive, subscribeBootAnim } from '../../lib/logoAnchor'
import HomeHeader from './HomeHeader'
import PortfolioHero from './PortfolioHero'
import AssetsSection from './AssetsSection'
import UpsellsSection from './UpsellsSection'
import RecentActivitySection from './RecentActivitySection'
import WalletActionBarOverlay from '../../components/WalletActionBarOverlay'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { hapticSubtle } from '../../lib/haptics'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setRecvInfo, setSendInfo, setAssetInfo } = useContext(FlowContext)
  const { isInitialLoad, navigate } = useContext(NavigationContext)
  const { balance } = useContext(WalletContext)
  const { nudge, nudgeVisible, nudgeCheckComplete } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const [homeScrolled, setHomeScrolled] = useState(false)
  const [balanceCollapseProgress, setBalanceCollapseProgress] = useState(0)
  const bootAnimActive = useSyncExternalStore(subscribeBootAnim, getBootAnimActive)
  const { balance: portfolioBalance, unit: portfolioBalanceUnit } = usePortfolioBalanceDisplay()
  const prefersReducedMotion = useReducedMotion()
  // Capture isInitialLoad at mount — it goes false before boot animation ends,
  // which would switch the stagger container from motion.div to plain div
  const shouldStagger = useRef(isInitialLoad).current

  // Show action bar once we have a balance (wallet loaded)
  const showActionBar = balance !== undefined

  const logoRef = useCallback((el: HTMLDivElement | null) => {
    setLogoAnchor(el)
  }, [])
  const balanceRef = useRef<HTMLDivElement | null>(null)
  const balanceCollapsedRef = useRef(false)
  const balanceHapticReadyRef = useRef(false)
  useEffect(() => () => setLogoAnchor(null), [])

  const pwaInstalled = usePwaInstalled()
  const dismissed = (config?.dismissedBanners ?? []).includes('pwa-install')
  const showPwaBanner = pwaCanInstall() && (isIOS() || isAndroid()) && !pwaInstalled && !dismissed

  const pwaDescription = isIOS()
    ? "Tap the share icon in Safari's toolbar, then 'Add to Home Screen'."
    : "Tap 'Install' to add Arkade to your home screen."

  const dismissPwaBanner = () => {
    if (!config) return
    const dismissedBanners = [...(config.dismissedBanners ?? []), 'pwa-install']
    updateConfig({ ...config, dismissedBanners })
  }

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  useEffect(() => {
    const scrollEl = document.querySelector<HTMLElement>('.wallet-home-content > .content-shell')
    if (!scrollEl) return

    let frame = 0
    const updateScrolled = () => {
      frame = 0
      setHomeScrolled(scrollEl.scrollTop > 2)

      const balanceEl = balanceRef.current
      if (!balanceEl) {
        setBalanceCollapseProgress(0)
        return
      }

      const balanceRect = balanceEl.getBoundingClientRect()
      const headerBottom = document.querySelector('.home-header')?.getBoundingClientRect().bottom ?? 56
      const collapseStart = headerBottom + 12
      const collapseEnd = headerBottom - 28
      const progress = prefersReducedMotion
        ? Number(balanceRect.top <= headerBottom)
        : (collapseStart - balanceRect.top) / (collapseStart - collapseEnd)
      const nextProgress = Math.max(0, Math.min(1, progress))
      const nextCollapsed = nextProgress >= 1

      if (!balanceHapticReadyRef.current) {
        balanceHapticReadyRef.current = true
      } else if (nextCollapsed !== balanceCollapsedRef.current) {
        hapticSubtle()
      }

      balanceCollapsedRef.current = nextCollapsed
      setBalanceCollapseProgress(nextProgress)
    }
    const handleScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScrolled)
    }

    updateScrolled()
    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      scrollEl.removeEventListener('scroll', handleScroll)
    }
  }, [prefersReducedMotion])

  const handleReceive = () => {
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveQRCode)
  }

  const handleSend = () => {
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  const handleSwap = () => {
    navigate(Pages.AppBoltzSwap)
  }

  const handleCreateAsset = () => {
    setAssetInfo({ assetId: '', supply: 0 })
    navigate(Pages.AppAssetCreate)
  }

  return (
    <>
      {announcement}
      <Content
        className={
          showActionBar
            ? `wallet-home-content has-wallet-action-bar ${homeScrolled ? 'wallet-home-content--scrolled' : ''}`
            : `wallet-home-content ${homeScrolled ? 'wallet-home-content--scrolled' : ''}`
        }
      >
        <Padded>
          <HomeHeader
            ref={logoRef}
            balance={portfolioBalance}
            balanceProgress={balanceCollapseProgress}
            balanceUnit={portfolioBalanceUnit}
            logoVisible={!bootAnimActive}
          />
          <WalletStaggerContainer animate={shouldStagger} hold={bootAnimActive}>
            <FlexCol gap='1.5rem'>
              <PortfolioHero ref={balanceRef} collapseProgress={balanceCollapseProgress} />
              <ErrorMessage error={error} text='Ark server unreachable' />
              <AssetsSection onCreateClick={handleCreateAsset} />
              <UpsellsSection />
              <RecentActivitySection />
              {nudge}
              {psaMessage ? <InfoBox html={psaMessage} /> : null}
              <DismissibleBanner
                id='pwa-install'
                icon={<HomeIcon />}
                title='Add Arkade to your home screen'
                description={pwaDescription}
                action={
                  canPromptInstall()
                    ? {
                        label: 'Install',
                        onClick: async () => {
                          const outcome = await promptPwaInstall().catch(() => null)
                          if (outcome) dismissPwaBanner()
                        },
                      }
                    : undefined
                }
                onDismiss={dismissPwaBanner}
                visible={Boolean(nudgeCheckComplete && !nudgeVisible && showPwaBanner)}
              />
              {/* Spacer to ensure content scrolls above the floating action bar */}
              {showActionBar ? <div className='h-36' aria-hidden='true' /> : null}
            </FlexCol>
          </WalletStaggerContainer>
        </Padded>
      </Content>
      <WalletActionBarOverlay
        visible={showActionBar}
        onSendClick={handleSend}
        onSwapClick={handleSwap}
        onReceiveClick={handleReceive}
      />
    </>
  )
}
