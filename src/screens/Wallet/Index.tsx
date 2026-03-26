import { useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Balance from '../../components/Balance'
import DismissibleBanner from '../../components/DismissibleBanner'
import ErrorMessage from '../../components/Error'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { ConfigContext } from '../../providers/config'
import LogoIcon from '../../icons/Logo'
import HomeIcon from '../../icons/Home'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import FlexCol from '../../components/FlexCol'
import Button from '../../components/Button'
import SendIcon from '../../icons/Send'
import ReceiveIcon from '../../icons/Receive'
import FlexRow from '../../components/FlexRow'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { NudgeContext } from '../../providers/nudge'
import { EmptyTxList } from '../../components/Empty'
import { InfoBox } from '../../components/AlertBox'
import { psaMessage } from '../../lib/constants'
import { AnnouncementContext } from '../../providers/announcements'
import { WalletStaggerContainer, WalletStaggerChild } from '../../components/WalletLoadIn'
import { pwaCanInstall, usePwaInstalled, canPromptInstall, promptPwaInstall } from '../../lib/pwa'
import { isIOS, isAndroid } from '../../lib/browser'
import { setLogoAnchor, getBootAnimActive, subscribeBootAnim } from '../../lib/logoAnchor'

export default function Wallet() {
  const { aspInfo } = useContext(AspContext)
  const { announcement } = useContext(AnnouncementContext)
  const { config, updateConfig } = useContext(ConfigContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { isInitialLoad, navigate } = useContext(NavigationContext)
  const { balance, txs } = useContext(WalletContext)
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

  const handleReceive = () => {
    setRecvInfo(emptyRecvInfo)
    navigate(Pages.ReceiveAmount)
  }

  const handleSend = () => {
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  return (
    <>
      {announcement}
      <Content>
        <Padded>
          {/* Anchor lives outside the stagger tree so getBoundingClientRect returns the final position */}
          <div ref={logoRef} style={{ display: 'inline-flex', visibility: bootAnimActive ? 'hidden' : 'visible' }}>
            <LogoIcon small />
          </div>
          <WalletStaggerContainer animate={shouldStagger} hold={bootAnimActive}>
            <FlexCol>
              <FlexCol gap='0'>
                <WalletStaggerChild animate={shouldStagger}>
                  <Balance amount={balance} />
                </WalletStaggerChild>
                <WalletStaggerChild animate={shouldStagger}>
                  <ErrorMessage error={error} text='Ark server unreachable' />
                </WalletStaggerChild>
                <WalletStaggerChild animate={shouldStagger}>
                  <FlexRow padding='0 0 0.5rem 0'>
                    <Button main icon={<SendIcon />} label='Send' onClick={handleSend} />
                    <Button main icon={<ReceiveIcon />} label='Receive' onClick={handleReceive} />
                  </FlexRow>
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
              {txs?.length === 0 ? (
                <WalletStaggerChild animate={shouldStagger}>
                  <div style={{ marginTop: '5rem', width: '100%' }}>
                    <EmptyTxList />
                  </div>
                </WalletStaggerChild>
              ) : (
                <WalletStaggerChild animate={shouldStagger}>
                  <TransactionsList />
                </WalletStaggerChild>
              )}
            </FlexCol>
          </WalletStaggerContainer>
        </Padded>
      </Content>
    </>
  )
}
