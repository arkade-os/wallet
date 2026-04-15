import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import DismissibleBanner from '../../components/DismissibleBanner'
import ErrorMessage from '../../components/Error'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import HomeIcon from '../../icons/Home'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import { NavigationContext, Pages } from '../../providers/navigation'
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
import AssetsSection from './AssetsSection'
import UpsellsSection from './UpsellsSection'
import RecentActivitySection from './RecentActivitySection'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { isInitialLoad, navigate } = useContext(NavigationContext)
  const { nudge, nudgeVisible, nudgeCheckComplete } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const bootAnimActive = useSyncExternalStore(subscribeBootAnim, getBootAnimActive)
  // Capture isInitialLoad at mount — it goes false before boot animation ends,
  // which would switch the stagger container from motion.div to plain div
  const shouldStagger = useRef(isInitialLoad).current

  const logoRef = useCallback((el: HTMLDivElement | null) => {
    setLogoAnchor(el)
  }, [])
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

  const handleCreateAsset = () => {
    // Prototype: direct navigate to the existing mint flow.
    // Future: open a family.co-style responsive modal launcher here.
    navigate(Pages.AppAssetMint)
  }

  return (
    <>
      {announcement}
      <Content>
        <Padded>
          <HomeHeader ref={logoRef} logoVisible={!bootAnimActive} />
          <WalletStaggerContainer animate={shouldStagger} hold={bootAnimActive}>
            <FlexCol gap='1.5rem'>
              <WalletStaggerChild animate={shouldStagger}>
                <PortfolioHero />
              </WalletStaggerChild>
              <WalletStaggerChild animate={shouldStagger}>
                <ErrorMessage error={error} text='Ark server unreachable' />
              </WalletStaggerChild>
              <WalletStaggerChild animate={shouldStagger}>
                <AssetsSection onCreateClick={handleCreateAsset} />
              </WalletStaggerChild>
              <WalletStaggerChild animate={shouldStagger}>
                <UpsellsSection />
              </WalletStaggerChild>
              <WalletStaggerChild animate={shouldStagger}>
                <RecentActivitySection />
              </WalletStaggerChild>
              <WalletStaggerChild animate={shouldStagger}>
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
              </WalletStaggerChild>
            </FlexCol>
          </WalletStaggerContainer>
        </Padded>
      </Content>
    </>
  )
}
