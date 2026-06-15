import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import SuccessIcon from '../icons/Success'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'
import { hapticLight } from '../lib/haptics'

interface WalletSuccessSplashProps {
  show?: boolean
  headline: string
  text?: string
  ariaLabel: string
  onDone: () => void
}

export default function WalletSuccessSplash({
  show = true,
  headline,
  text,
  ariaLabel,
  onDone,
}: WalletSuccessSplashProps) {
  useEffect(() => {
    if (show) hapticLight()
  }, [show])

  const handleDone = () => {
    hapticLight()
    onDone()
  }

  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          type='button'
          className='wallet-success-splash'
          onClick={handleDone}
          initial={{ transform: 'translate3d(0, 100%, 0)' }}
          animate={{ transform: 'translate3d(0, 0%, 0)' }}
          exit={{ transform: 'translate3d(0, 100%, 0)' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.95 }}
          aria-label={ariaLabel}
        >
          <motion.span
            className='wallet-success-splash__mark'
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.16, type: 'spring', duration: 0.42, bounce: 0.18 }}
          >
            <SuccessIcon small />
          </motion.span>
          <motion.span
            className='wallet-success-splash__copy'
            initial={{ opacity: 0, transform: 'translate3d(0, 10px, 0)' }}
            animate={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
            transition={{ delay: 0.2, duration: 0.24, ease: EASE_OUT_QUINT_TUPLE }}
          >
            <strong>{headline}</strong>
            {text ? <small>{text}</small> : null}
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
