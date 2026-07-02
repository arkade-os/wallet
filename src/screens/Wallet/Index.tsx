import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import DismissibleBanner from '../../components/DismissibleBanner'
import ErrorMessage from '../../components/Error'
import { AspContext } from '../../providers/asp'
import { aspErrorText } from '../../lib/asp'
import { ConfigContext } from '../../providers/config'
import HomeIcon from '../../icons/Home'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { NavigationContext } from '../../providers/navigation'
import { NudgeContext } from '../../providers/nudge'
import { InfoBox } from '../../components/AlertBox'
import { psaMessage } from '../../lib/constants'
import { AnnouncementContext } from '../../providers/announcements'
import { WalletStaggerContainer, WalletStaggerChild } from '../../components/WalletLoadIn'
import { pwaCanInstall, usePwaInstalled, canPromptInstall, promptPwaInstall } from '../../lib/pwa'
import { isIOS, isAndroid } from '../../lib/browser'
import { setLogoAnchor, getBootAnimActive, subscribeBootAnim } from '../../lib/logoAnchor'
import HomeHeader from './HomeHeader'
import PortfolioHero from './PortfolioHero'
import HomeQuickActions from './HomeQuickActions'
import AssetsSection from './AssetsSection'
import UpsellsSection from './UpsellsSection'
import RecentActivitySection from './RecentActivitySection'
import { usePortfolioBalanceDisplay } from '../../hooks/usePortfolioBalanceDisplay'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { isInitialLoad } = useContext(NavigationContext)
  const { nudge, nudgeCheckComplete } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const [homeScrolled, setHomeScrolled] = useState(false)
  const [balanceCollapseProgress, setBalanceCollapseProgress] = useState(0)
  const bootAnimActive = useSyncExternalStore(subscribeBootAnim, getBootAnimActive)
  const {
    balance: portfolioBalance,
    maskedBalance: maskedPortfolioBalance,
    unit: portfolioBalanceUnit,
  } = usePortfolioBalanceDisplay()
  const prefersReducedMotion = useReducedMotion()
  // Capture isInitialLoad at mount — it goes false before boot animation ends,
  // which would switch the stagger container from motion.div to plain div
  const shouldStagger = useRef(isInitialLoad).current

  const logoRef = useCallback((el: HTMLDivElement | null) => {
    setLogoAnchor(el)
  }, [])
  const balanceRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => () => setLogoAnchor(null), [])

  const pwaInstalled = usePwaInstalled()
  const dismissed = (config?.dismissedBanners ?? []).includes('pwa-install')
  const showPwaBanner = pwaCanInstall() && (isIOS() || isAndroid()) && !pwaInstalled && !dismissed
  const pwaBannerVisible = Boolean(nudgeCheckComplete && showPwaBanner)
  const hasHomeNotices = Boolean(nudge || pwaBannerVisible)

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
    const scrollEl = document.querySelector<HTMLElement>('.wallet-home-content')
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
      setBalanceCollapseProgress(Math.max(0, Math.min(1, progress)))
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

  return (
    <>
      {announcement}
      <Content className={homeScrolled ? 'wallet-home-content wallet-home-content--scrolled' : 'wallet-home-content'}>
        <Padded>
          <HomeHeader
            ref={logoRef}
            balance={portfolioBalance}
            balanceProgress={balanceCollapseProgress}
            balanceUnit={portfolioBalanceUnit}
            logoVisible={!bootAnimActive}
            maskedBalance={maskedPortfolioBalance}
          />
          <WalletStaggerContainer animate={shouldStagger} className='home-stack' hold={bootAnimActive}>
            <WalletStaggerChild animate={shouldStagger} className='home-stack__hero'>
              <PortfolioHero ref={balanceRef} collapseProgress={balanceCollapseProgress} />
            </WalletStaggerChild>
            <WalletStaggerChild animate={shouldStagger} className='home-stack__actions'>
              <HomeQuickActions />
            </WalletStaggerChild>
            {hasHomeNotices ? (
              <WalletStaggerChild animate={shouldStagger}>
                <FlexCol gap='0.75rem'>
                  {nudge}
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
                    visible={pwaBannerVisible}
                  />
                </FlexCol>
              </WalletStaggerChild>
            ) : null}
            {error ? (
              <WalletStaggerChild animate={shouldStagger}>
                <ErrorMessage error={error} text={aspErrorText(aspInfo, 'Arkade server unreachable')} />
              </WalletStaggerChild>
            ) : null}
            <WalletStaggerChild animate={shouldStagger} className='home-stack__section'>
              <AssetsSection />
            </WalletStaggerChild>
            <WalletStaggerChild animate={shouldStagger} className='home-stack__section'>
              <UpsellsSection />
            </WalletStaggerChild>
            <WalletStaggerChild animate={shouldStagger} className='home-stack__section'>
              <RecentActivitySection />
            </WalletStaggerChild>
            {psaMessage ? (
              <WalletStaggerChild animate={shouldStagger} className='home-stack__section'>
                <InfoBox html={psaMessage} />
              </WalletStaggerChild>
            ) : null}
          </WalletStaggerContainer>
        </Padded>
      </Content>
    </>
  )
}
