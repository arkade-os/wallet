import { useContext } from 'react'
import { useTranslation } from '../providers/language'
import HomeIcon from '../icons/Home'
import HistoryIcon from '../icons/History'
import SettingsIcon from '../icons/Settings'
import { hapticLight } from '../lib/haptics'
import { SettingsOptions } from '../lib/types'
import { NavigationContext, Pages } from '../providers/navigation'
import { WalletContext } from '../providers/wallet'
import { OptionsContext } from '../providers/options'
import UsersRound from '../icons/UsersRound'

interface DesktopWalletShellProps {
  logoVisible: boolean
  page: Pages
}

export default function DesktopWalletShell({ logoVisible, page }: DesktopWalletShellProps) {
  const { navigate } = useContext(NavigationContext)
  const { booting, dataReady } = useContext(WalletContext)
  const homeBusy = Boolean(booting) && !dataReady
  const { setOption, option } = useContext(OptionsContext)

  const { t } = useTranslation()

  const activityActive = page === Pages.Activity || page === Pages.Transaction
  const settingsActive = page === Pages.Settings || page === Pages.Vtxos
  const homeActive = !activityActive && !settingsActive

  const goHome = () => {
    hapticLight()
    navigate(Pages.Wallet)
  }

  const goToActivity = () => {
    if (homeBusy) return
    hapticLight()
    navigate(Pages.Activity)
  }

  const goToSettings = () => {
    if (homeBusy) return
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  const contactsActive = page === Pages.Settings && option === SettingsOptions.Contacts

  return (
    <aside className='desktop-wallet-shell' aria-label='Wallet navigation'>
      <div className='desktop-wallet-brand' style={{ visibility: logoVisible ? 'visible' : 'hidden' }}>
        <span>Arkade</span>
      </div>
      <nav className='desktop-wallet-nav' aria-label='Primary navigation'>
        <button
          type='button'
          className={
            homeActive ? 'desktop-wallet-nav__item desktop-wallet-nav__item--active' : 'desktop-wallet-nav__item'
          }
          aria-current={homeActive ? 'page' : undefined}
          data-testid='desktop-nav-home'
          onClick={goHome}
        >
          <HomeIcon size={20} strokeWidth={1.8} />
          <span>{t('common.home')}</span>
        </button>
        <button
          type='button'
          className={
            activityActive ? 'desktop-wallet-nav__item desktop-wallet-nav__item--active' : 'desktop-wallet-nav__item'
          }
          aria-current={activityActive ? 'page' : undefined}
          data-testid='desktop-nav-activity'
          disabled={homeBusy}
          onClick={goToActivity}
        >
          <HistoryIcon size={20} strokeWidth={1.8} />
          <span>{t('wallet.activity')}</span>
        </button>
        <button
          type='button'
          className={
            contactsActive ? 'desktop-wallet-nav__item desktop-wallet-nav__item--active' : 'desktop-wallet-nav__item'
          }
          aria-current={contactsActive ? 'page' : undefined}
          data-testid='desktop-nav-contacts'
          disabled={homeBusy}
          onClick={() => {
            if (homeBusy) return
            hapticLight()
            setOption(SettingsOptions.Contacts)
            navigate(Pages.Settings)
          }}
        >
          <UsersRound />
          <span>{t('contacts.title')}</span>
        </button>
        <button
          type='button'
          className={
            settingsActive && !contactsActive
              ? 'desktop-wallet-nav__item desktop-wallet-nav__item--active'
              : 'desktop-wallet-nav__item'
          }
          aria-current={settingsActive && !contactsActive ? 'page' : undefined}
          data-testid='desktop-nav-settings'
          disabled={homeBusy}
          onClick={goToSettings}
        >
          <SettingsIcon size={19} strokeWidth={1.8} />
          <span>{t('settings.title')}</span>
        </button>
      </nav>
    </aside>
  )
}
