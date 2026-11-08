import { ReactNode, useContext, useState } from 'react'
import ReceiveIcon from '../../icons/Receive'
import ScanIcon from '../../icons/Scan'
import SendIcon from '../../icons/Send'
import SwapIcon from '../../icons/Swap'
import SwapComingSoonSheet from '../../components/SwapComingSoonSheet'
import { SwapsContext } from '../../providers/swaps'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticLight } from '../../lib/haptics'
import { useTranslation } from '../../providers/language'
import { WalletContext } from '../../providers/wallet'
import { canRequestNativeSigning } from '../../lib/nativeSignerAvailability'
import { isNativeWallet } from '../../lib/nativeWallet'
import NativeCardConnectSheet from '../../components/NativeCardConnectSheet'

interface HomeAction {
  icon: ReactNode
  label: string
  onClick?: () => void
  testId: string
  disabled?: boolean
}

export default function HomeQuickActions() {
  const { navigate } = useContext(NavigationContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)
  const { swapAvailable } = useContext(SwapsContext)
  const { wallet } = useContext(WalletContext)
  const [swapSheetOpen, setSwapSheetOpen] = useState(false)
  const [cardSheetOpen, setCardSheetOpen] = useState(false)
  const { t } = useTranslation()

  const openSend = () => {
    setSendInfo(emptySendInfo)
    navigate(Pages.SendForm)
  }

  const actions: HomeAction[] = [
    {
      icon: <ReceiveIcon />,
      label: t('wallet.receive'),
      onClick: () => {
        setRecvInfo(emptyRecvInfo)
        navigate(Pages.ReceiveQRCode)
      },
      testId: 'home-action-receive',
    },
    {
      icon: <SendIcon />,
      label: t('wallet.send'),
      onClick: () => {
        if (isNativeWallet(wallet) && !canRequestNativeSigning(wallet.pubkey)) setCardSheetOpen(true)
        else openSend()
      },
      testId: 'home-action-send',
    },
    {
      icon: <SwapIcon />,
      label: t('wallet.swap'),
      onClick: () => {
        if (swapAvailable) navigate(Pages.WalletSwap)
        else setSwapSheetOpen(true)
      },
      testId: 'home-action-swap',
    },
    {
      icon: <ScanIcon />,
      label: t('wallet.scan'),
      onClick: () => {
        navigate(Pages.WalletScan)
      },
      testId: 'home-action-scan',
    },
  ]

  const actionButtonProps = (action: HomeAction) => ({
    type: 'button' as const,
    className: `home-quick-action${action.disabled ? ' home-quick-action--disabled' : ''}`,
    'data-testid': action.testId,
    disabled: action.disabled,
    'aria-disabled': action.disabled,
    onClick: () => {
      if (action.disabled) return
      hapticLight()
      action.onClick?.()
    },
  })

  return (
    <>
      <div className='home-quick-actions' role='toolbar' aria-label={t('wallet.walletActions')}>
        {actions.map((action) => (
          <button key={action.label} {...actionButtonProps(action)}>
            <span className='home-quick-action__icon'>{action.icon}</span>
            <span className='home-quick-action__label'>{action.label}</span>
          </button>
        ))}
      </div>
      <SwapComingSoonSheet isOpen={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} />
      <NativeCardConnectSheet
        isOpen={cardSheetOpen}
        onClose={() => setCardSheetOpen(false)}
        onConnected={() => {
          setCardSheetOpen(false)
          openSend()
        }}
      />
    </>
  )
}
