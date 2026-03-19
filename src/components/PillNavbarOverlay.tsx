import { createPortal } from 'react-dom'
import PillNavbar from './PillNavbar'

interface PillNavbarOverlayProps {
  activeTab: string
  onWalletClick: () => void
  onAppsClick: () => void
  onSettingsClick: () => void
}

export default function PillNavbarOverlay({
  activeTab,
  onWalletClick,
  onAppsClick,
  onSettingsClick,
}: PillNavbarOverlayProps) {
  return createPortal(
    <div className='pill-navbar-layer'>
      <div className='pill-navbar-haze' aria-hidden='true' />
      <PillNavbar
        activeTab={activeTab}
        onWalletClick={onWalletClick}
        onAppsClick={onAppsClick}
        onSettingsClick={onSettingsClick}
      />
    </div>,
    document.body,
  )
}
