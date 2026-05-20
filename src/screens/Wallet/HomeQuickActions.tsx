import { motion } from 'framer-motion'
import { ReactNode, useContext, useState } from 'react'
import ReceiveIcon from '../../icons/Receive'
import ScanIcon from '../../icons/Scan'
import SendIcon from '../../icons/Send'
import SwapIcon from '../../icons/Swap'
import Button from '../../components/Button'
import SheetModal from '../../components/SheetModal'
import { emptyRecvInfo, emptySendInfo, FlowContext } from '../../providers/flow'
import { NavigationContext, Pages } from '../../providers/navigation'
import { homeActionStaggerChild, homeActionStaggerContainer } from '../../lib/animations'
import { hapticLight } from '../../lib/haptics'
import { useReducedMotion } from '../../hooks/useReducedMotion'

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
  const [swapSheetOpen, setSwapSheetOpen] = useState(false)
  const prefersReduced = useReducedMotion()

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
        setSwapSheetOpen(true)
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

  if (prefersReduced) {
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

  return (
    <>
      <motion.div
        className='home-quick-actions'
        role='toolbar'
        aria-label='Wallet actions'
        variants={homeActionStaggerContainer}
      >
        {actions.map((action) => (
          <motion.button
            key={action.label}
            variants={homeActionStaggerChild}
            whileTap={action.disabled ? undefined : { scale: 0.97 }}
            {...actionButtonProps(action)}
          >
            <span className='home-quick-action__icon'>{action.icon}</span>
            <span className='home-quick-action__label'>{action.label}</span>
          </motion.button>
        ))}
      </motion.div>
      <SwapComingSoonSheet isOpen={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} />
    </>
  )
}

function SwapComingSoonSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <SheetModal isOpen={isOpen} onClose={onClose}>
      <div className='swap-coming-soon' data-testid='swap-coming-soon-sheet'>
        <div className='swap-coming-soon__icon' aria-hidden='true'>
          <SwapIcon />
        </div>
        <div className='swap-coming-soon__copy'>
          <h2 className='swap-coming-soon__title'>Swaps are coming soon</h2>
          <p className='swap-coming-soon__description'>
            We are polishing the swap experience before turning it on here.
          </p>
        </div>
        <Button label='Got it' onClick={onClose} />
      </div>
    </SheetModal>
  )
}
