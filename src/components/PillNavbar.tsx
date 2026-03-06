import { useEffect, useRef } from 'react'
import WalletIcon from '../icons/Wallet'
import AppsIcon from '../icons/Apps'
import SettingsIcon from '../icons/Settings'

interface PillNavbarProps {
  activeTab: string
  onWalletClick: () => void
  onAppsClick: () => void
  onSettingsClick: () => void
}

export default function PillNavbar({ activeTab, onWalletClick, onAppsClick, onSettingsClick }: PillNavbarProps) {
  const walletRef = useRef<HTMLDivElement>(null)
  const appsRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ref =
      activeTab === 'wallet'
        ? walletRef
        : activeTab === 'apps'
          ? appsRef
          : activeTab === 'settings'
            ? settingsRef
            : null
    if (!ref?.current) return
    const el = ref.current
    el.classList.remove('pill-icon-pop')
    void el.offsetWidth
    el.classList.add('pill-icon-pop')
    const handleEnd = () => el.classList.remove('pill-icon-pop')
    el.addEventListener('animationend', handleEnd)
    return () => el.removeEventListener('animationend', handleEnd)
  }, [activeTab])

  return (
    <nav className='pill-navbar' role='tablist' aria-label='Main navigation'>
      <button
        className={`pill-nav-btn ${activeTab === 'wallet' ? 'pill-nav-btn--active' : ''}`}
        onClick={onWalletClick}
        role='tab'
        aria-selected={activeTab === 'wallet'}
        aria-label='Wallet'
        data-testid='tab-wallet'
      >
        <div ref={walletRef} className='pill-nav-icon'>
          <WalletIcon active={activeTab === 'wallet'} />
        </div>
        <span className='pill-nav-label'>Wallet</span>
      </button>
      <button
        className={`pill-nav-btn ${activeTab === 'apps' ? 'pill-nav-btn--active' : ''}`}
        onClick={onAppsClick}
        role='tab'
        aria-selected={activeTab === 'apps'}
        aria-label='Apps'
        data-testid='tab-apps'
      >
        <div ref={appsRef} className='pill-nav-icon'>
          <AppsIcon active={activeTab === 'apps'} />
        </div>
        <span className='pill-nav-label'>Apps</span>
      </button>
      <button
        className={`pill-nav-btn ${activeTab === 'settings' ? 'pill-nav-btn--active' : ''}`}
        onClick={onSettingsClick}
        role='tab'
        aria-selected={activeTab === 'settings'}
        aria-label='Settings'
        data-testid='tab-settings'
      >
        <div ref={settingsRef} className='pill-nav-icon'>
          <SettingsIcon active={activeTab === 'settings'} />
        </div>
        <span className='pill-nav-label'>Settings</span>
      </button>
    </nav>
  )
}
