import { useEffect, useRef } from 'react'
import WalletIcon from '../icons/Wallet'
import AppsIcon from '../icons/Apps'

interface PillNavbarProps {
  activeTab: string
  onWalletClick: () => void
  onAppsClick: () => void
}

export default function PillNavbar({ activeTab, onWalletClick, onAppsClick }: PillNavbarProps) {
  const walletRef = useRef<HTMLDivElement>(null)
  const appsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ref = activeTab === 'wallet' ? walletRef : activeTab === 'apps' ? appsRef : null
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
      >
        <div ref={appsRef} className='pill-nav-icon'>
          <AppsIcon />
        </div>
        <span className='pill-nav-label'>Apps</span>
      </button>
    </nav>
  )
}
