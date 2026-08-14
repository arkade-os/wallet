import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SuccessIcon from '../icons/Success'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'
import { activateDocumentSurface } from '../lib/documentSurface'
import { hapticLight } from '../lib/haptics'
import { useReducedMotion } from '../hooks/useReducedMotion'

const SUCCESS_SURFACE_CLASS = 'wallet-success-surface-active'
const SUCCESS_THEME_COLOR = '#5528d4'

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
  const releaseSurfaceRef = useRef<(() => void) | undefined>()

  useEffect(() => {
    if (show) hapticLight()
  }, [show])

  useLayoutEffect(() => {
    if (!show || releaseSurfaceRef.current) return
    releaseSurfaceRef.current = activateDocumentSurface({
      className: SUCCESS_SURFACE_CLASS,
      themeColor: SUCCESS_THEME_COLOR,
    })
  }, [show])

  useLayoutEffect(
    () => () => {
      releaseSurfaceRef.current?.()
      releaseSurfaceRef.current = undefined
    },
    [],
  )

  const releaseSurface = () => {
    releaseSurfaceRef.current?.()
    releaseSurfaceRef.current = undefined
  }

  const handleDone = () => {
    hapticLight()
    onDone()
  }

  return createPortal(
    <AnimatePresence onExitComplete={releaseSurface}>
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
    </AnimatePresence>,
    document.body,
  )
}
