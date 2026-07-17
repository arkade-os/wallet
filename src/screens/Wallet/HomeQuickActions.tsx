import { ReactNode, useContext, useState } from 'react'
import ReceiveIcon from '../../icons/Receive'
import ScanIcon from '../../icons/Scan'
import SendIcon from '../../icons/Send'
import SwapIcon from '../../icons/Swap'
import SwapComingSoonSheet from '../../components/SwapComingSoonSheet'
import { AssetSwapsContext } from '../../providers/assetSwaps'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticLight } from '../../lib/haptics'

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
  const { swapAvailable, swaps } = useContext(AssetSwapsContext)
  const [swapSheetOpen, setSwapSheetOpen] = useState(false)

  const actions: HomeAction[] = [
    {
      icon: <ReceiveIcon />,
      label: 'Receive',
      onClick: () => {
        setRecvInfo(emptyRecvInfo)
        navigate(Pages.ReceiveQRCode)
      },
      testId: 'home-action-receive',
    },
    {
      icon: <SendIcon />,
      label: 'Send',
      onClick: () => {
        setSendInfo(emptySendInfo)
        navigate(Pages.SendForm)
      },
      testId: 'home-action-send',
    },
    {
      icon: <SwapIcon />,
      label: 'Swap',
      onClick: () => {
        // existing swaps stay reachable during outages so pending funds
        // remain cancellable from the swap screen
        if (swapAvailable || swaps.length > 0) navigate(Pages.WalletSwap)
        else setSwapSheetOpen(true)
      },
      testId: 'home-action-swap',
    },
    {
      icon: <ScanIcon />,
      label: 'Scan',
      onClick: () => {
        setSendInfo({ ...emptySendInfo, scan: true })
        navigate(Pages.SendForm)
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
      <div className='home-quick-actions' role='toolbar' aria-label='Wallet actions'>
        {actions.map((action) => (
          <button key={action.label} {...actionButtonProps(action)}>
            <span className='home-quick-action__icon'>{action.icon}</span>
            <span className='home-quick-action__label'>{action.label}</span>
          </button>
        ))}
      </div>
      <SwapComingSoonSheet isOpen={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} />
    </>
  )
}
