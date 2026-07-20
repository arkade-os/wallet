import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import SuccessIcon from '../icons/Success'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'
import { hapticLight } from '../lib/haptics'
import { useReducedMotion } from '../hooks/useReducedMotion'

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
  const prefersReduced = useReducedMotion()
  useEffect(() => {
    if (show) hapticLight()
  }, [show])

  // The splash must read full-bleed: the OS bars around it (Android PWA
  // status/nav bars, iOS status-bar backdrop) are painted from the
  // theme-color meta, which is white in light mode — leaving white bands
  // above and below the purple. Match it to the splash while shown.
  useEffect(() => {
    if (!show) return
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) return
    const previous = meta.getAttribute('content')
    meta.setAttribute('content', '#5528d4') // --purple-600, the gradient's top
    return () => {
      if (previous) meta.setAttribute('content', previous)
    }
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
          initial={prefersReduced ? false : { y: '100%' }}
          animate={prefersReduced ? undefined : { y: '0%' }}
          exit={prefersReduced ? undefined : { y: '100%' }}
          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30, mass: 0.95 }}
          aria-label={ariaLabel}
        >
          <motion.span
            className='wallet-success-splash__mark'
            initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
            animate={prefersReduced ? undefined : { opacity: 1, scale: 1 }}
            transition={
              prefersReduced ? { duration: 0 } : { delay: 0.16, type: 'spring', duration: 0.42, bounce: 0.18 }
            }
          >
            <SuccessIcon small />
          </motion.span>
          <motion.span
            className='wallet-success-splash__copy'
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
            transition={prefersReduced ? { duration: 0 } : { delay: 0.2, duration: 0.24, ease: EASE_OUT_QUINT_TUPLE }}
          >
            <strong>{headline}</strong>
            {text ? <small>{text}</small> : null}
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
