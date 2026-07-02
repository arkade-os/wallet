import { AnimatePresence, motion } from 'framer-motion'
import { MouseEvent, ReactNode, useContext } from 'react'
import { ConfigContext } from '../providers/config'
import { hapticLight } from '../lib/haptics'
import { cn } from '../lib/utils'

interface PrivacyAmountProps {
  children: ReactNode
  className?: string
  interactive?: boolean
  masked: ReactNode
  testId?: string
}

export function PrivacyAmount({ children, className, interactive = false, masked, testId }: PrivacyAmountProps) {
  const { config } = useContext(ConfigContext)
  const visible = config.showBalance

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    hapticLight()
  }

  const value = (
    <AnimatePresence mode='popLayout' initial={false}>
      <motion.span
        key={visible ? 'visible' : 'hidden'}
        className='privacy-amount__value'
        initial={{ opacity: 0, transform: 'translate3d(0, 0.25rem, 0)', filter: 'blur(2px)' }}
        animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)', filter: 'blur(0px)' }}
        exit={{ opacity: 0, transform: 'translate3d(0, -0.25rem, 0)', filter: 'blur(2px)' }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      >
        {visible ? children : masked}
      </motion.span>
    </AnimatePresence>
  )

  if (!interactive) {
    return (
      <span className={cn('privacy-amount', className)} data-testid={testId}>
        {value}
      </span>
    )
  }

  return (
    <button
      type='button'
      aria-label={visible ? 'Hide balances' : 'Show balances'}
      aria-pressed={visible}
      className={cn('privacy-amount privacy-amount--interactive', className)}
      data-testid={testId}
      onClick={handleClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {value}
    </button>
  )
}

export function maskedFiat(symbol = '$') {
  return `${symbol}••••`
}
