import { useEffect, useRef } from 'react'
import WalletIcon from '../icons/Wallet'
import SettingsIcon from '../icons/Settings'
import { useTranslation } from '../providers/language'

interface PillNavbarProps {
  activeTab: string
  onWalletClick: () => void
  onSettingsClick: () => void
}

export default function PillNavbar({ activeTab, onWalletClick, onSettingsClick }: PillNavbarProps) {
  const { t } = useTranslation()
  const walletRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ref = activeTab === 'wallet' ? walletRef : activeTab === 'settings' ? settingsRef : null
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
    <nav className='pill-navbar' role='tablist' aria-label={t('wallet.mainNavigation')}>
      <button
        className={`pill-nav-btn ${activeTab === 'wallet' ? 'pill-nav-btn--active' : ''}`}
        onClick={onWalletClick}
        role='tab'
        aria-selected={activeTab === 'wallet'}
        aria-label={t('wallet.wallet')}
        data-testid='tab-wallet'
      >
        <div ref={walletRef} className='pill-nav-icon'>
          <WalletIcon />
        </div>
        <span className='pill-nav-label'>{t('wallet.wallet')}</span>
      </button>
      <button
        className={`pill-nav-btn ${activeTab === 'settings' ? 'pill-nav-btn--active' : ''}`}
        onClick={onSettingsClick}
        role='tab'
        aria-selected={activeTab === 'settings'}
        aria-label={t('settings.title')}
        data-testid='tab-settings'
      >
        <div ref={settingsRef} className='pill-nav-icon'>
          <SettingsIcon />
        </div>
        <span className='pill-nav-label'>{t('settings.title')}</span>
      </button>
    </nav>
  )
}
