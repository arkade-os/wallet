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

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setRecvInfo, setSendInfo, setAssetInfo } = useContext(FlowContext)
  const { isInitialLoad, navigate } = useContext(NavigationContext)
  const { balance } = useContext(WalletContext)
  const { nudge, nudgeVisible, nudgeCheckComplete } = useContext(NudgeContext)

  const [error, setError] = useState(false)
  const bootAnimActive = useSyncExternalStore(subscribeBootAnim, getBootAnimActive)
  // Capture isInitialLoad at mount — it goes false before boot animation ends,
  // which would switch the stagger container from motion.div to plain div
  const shouldStagger = useRef(isInitialLoad).current

  // Show action bar once we have a balance (wallet loaded)
  const showActionBar = balance !== undefined

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
      <Content className={showActionBar ? 'has-wallet-action-bar' : ''}>
        <Padded>
          <HomeHeader ref={logoRef} logoVisible={!bootAnimActive} />
          <WalletStaggerContainer animate={shouldStagger} hold={bootAnimActive}>
            <FlexCol gap="1.5rem">
              <PortfolioHero />
              <ErrorMessage error={error} text="Ark server unreachable" />
              <AssetsSection onCreateClick={handleCreateAsset} />
              <UpsellsSection />
              <RecentActivitySection />
              {nudge}
              {psaMessage ? <InfoBox html={psaMessage} /> : null}
              <DismissibleBanner
                id="pwa-install"
                icon={<HomeIcon />}
                title="Add Arkade to your home screen"
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
