import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import WalletActionBar from './WalletActionBar'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'

interface WalletActionBarOverlayProps {
  visible: boolean
  onSendClick: () => void
  onSwapClick: () => void
  onReceiveClick: () => void
}

/**
 * Fixed overlay pinned to the bottom of the viewport holding the wallet action
 * bar. Renders a radial gradient haze behind the buttons for depth and to
 * smoothly fade the scrolling content behind them.
 */
export default function WalletActionBarOverlay({
  visible,
  onSendClick,
  onSwapClick,
  onReceiveClick,
}: WalletActionBarOverlayProps) {
  const prefersReduced = useReducedMotion()
  const transition = prefersReduced
    ? { duration: 0 }
    : visible
      ? { duration: 0.28, ease: EASE_OUT_QUINT_TUPLE }
      : { duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }

  return createPortal(
    <motion.div
      className={`wallet-action-bar-layer ${!visible ? 'wallet-action-bar-layer--hidden' : ''}`}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: '115%' }}
      initial={false}
      transition={transition}
      {...(!visible && { inert: '' })}
      style={{ willChange: visible ? 'transform, opacity' : 'auto' }}
    >
      <div className='wallet-action-bar-haze' aria-hidden='true' />
      <div className='wallet-action-bar-dock'>
        <WalletActionBar onSendClick={onSendClick} onSwapClick={onSwapClick} onReceiveClick={onReceiveClick} />
      </div>
    </motion.div>,
    document.body,
  )
}
