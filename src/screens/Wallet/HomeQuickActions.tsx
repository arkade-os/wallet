import { ReactNode, useContext } from 'react'
import ReceiveIcon from '../../icons/Receive'
import ScanIcon from '../../icons/Scan'
import SendIcon from '../../icons/Send'
import SwapIcon from '../../icons/Swap'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { hapticLight } from '../../lib/haptics'

interface HomeAction {
  icon: ReactNode
  label: string
  onClick: () => void
  testId: string
}

export default function HomeQuickActions() {
  const { navigate } = useContext(NavigationContext)
  const { setRecvInfo, setSendInfo } = useContext(FlowContext)

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
        navigate(Pages.WalletSwap)
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

  return (
    <div className='home-quick-actions' role='toolbar' aria-label='Wallet actions'>
      {actions.map((action) => (
        <button
          key={action.label}
          type='button'
          className='home-quick-action'
          data-testid={action.testId}
          onClick={() => {
            hapticLight()
            action.onClick()
          }}
        >
          <span className='home-quick-action__icon'>{action.icon}</span>
          <span className='home-quick-action__label'>{action.label}</span>
        </button>
      ))}
    </div>
  )
}
