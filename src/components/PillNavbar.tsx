import { useEffect, useRef } from 'react'
import WalletIcon from '../icons/Wallet'
import AppsIcon from '../icons/Apps'
import SettingsIcon from '../icons/Settings'
import { useReducedMotion } from '../hooks/useReducedMotion'

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
  const prefersReduced = useReducedMotion()

  const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
    wallet: walletRef,
    apps: appsRef,
    settings: settingsRef,
  }

  useEffect(() => {
    const ref = refMap[activeTab] ?? null
    if (!ref?.current || prefersReduced) return
    const el = ref.current
    el.classList.remove('pill-icon-pop')
    void el.offsetWidth
    el.classList.add('pill-icon-pop')
    const handleEnd = () => el.classList.remove('pill-icon-pop')
    el.addEventListener('animationend', handleEnd)
    return () => el.removeEventListener('animationend', handleEnd)
  }, [activeTab, prefersReduced])

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
          <WalletIcon />
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
          <AppsIcon />
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
          <SettingsIcon />
        </div>
        <span className='pill-nav-label'>Settings</span>
      </button>
    </nav>
  )
}
