import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import PillNavbar from './PillNavbar'

interface PillNavbarOverlayProps {
  visible: boolean
  activeTab: string
  onWalletClick: () => void
  onAppsClick: () => void
  onSettingsClick: () => void
}

export default function PillNavbarOverlay({
  visible,
  activeTab,
  onWalletClick,
  onAppsClick,
  onSettingsClick,
}: PillNavbarOverlayProps) {
  const prefersReduced = useReducedMotion()

  return createPortal(
    <motion.div
      className={`pill-navbar-layer ${!visible ? 'pill-navbar-layer--hidden' : ''}`}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      initial={false}
      transition={prefersReduced ? { duration: 0 } : { type: 'spring', duration: 0.5, bounce: 0.25 }}
      {...(!visible && { inert: '' })}
    >
      <div className='pill-navbar-chrome' aria-hidden='true' />
      <div className='pill-navbar-slot'>
        <PillNavbar
          activeTab={activeTab}
          onWalletClick={onWalletClick}
          onAppsClick={onAppsClick}
          onSettingsClick={onSettingsClick}
        />
      </div>
    </motion.div>,
    document.body,
  )
}
