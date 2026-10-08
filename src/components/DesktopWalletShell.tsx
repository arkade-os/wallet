import { useCallback, useContext } from 'react'
import SmallLogo from './SmallLogo'
import HomeIcon from '../icons/Home'
import HistoryIcon from '../icons/History'
import SettingsIcon from '../icons/Settings'
import { hapticLight } from '../lib/haptics'
import { setDesktopLogoAnchor } from '../lib/logoAnchor'
import { SettingsOptions } from '../lib/types'
import { NavigationContext, Pages } from '../providers/navigation'
import { OptionsContext } from '../providers/options'

interface DesktopWalletShellProps {
  logoVisible: boolean
  page: Pages
}

export default function DesktopWalletShell({ logoVisible, page }: DesktopWalletShellProps) {
  const { navigate } = useContext(NavigationContext)
  const { setOption } = useContext(OptionsContext)
  const logoRef = useCallback((element: HTMLDivElement | null) => setDesktopLogoAnchor(element), [])

  const activityActive = page === Pages.Activity || page === Pages.Transaction
  const settingsActive = page === Pages.Settings || page === Pages.Vtxos
  const homeActive = !activityActive && !settingsActive

  const goHome = () => {
    hapticLight()
    navigate(Pages.Wallet)
  }

  const goToActivity = () => {
    hapticLight()
    navigate(Pages.Activity)
  }

  const goToSettings = () => {
    hapticLight()
    setOption(SettingsOptions.Menu)
    navigate(Pages.Settings)
  }

  return (
    <aside className='desktop-wallet-shell' aria-label='Wallet navigation'>
      <div className='desktop-wallet-brand' style={{ visibility: logoVisible ? 'visible' : 'hidden' }}>
        <div ref={logoRef} className='desktop-wallet-brand__mark'>
          <SmallLogo />
        </div>
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
          <HomeIcon />
          <span>Home</span>
        </button>
        <button
          type='button'
          className={
            activityActive ? 'desktop-wallet-nav__item desktop-wallet-nav__item--active' : 'desktop-wallet-nav__item'
          }
          aria-current={activityActive ? 'page' : undefined}
          data-testid='desktop-nav-activity'
          onClick={goToActivity}
        >
          <HistoryIcon size={20} strokeWidth={1.8} />
          <span>Activity</span>
        </button>
        <button
          type='button'
          className={
            settingsActive ? 'desktop-wallet-nav__item desktop-wallet-nav__item--active' : 'desktop-wallet-nav__item'
          }
          aria-current={settingsActive ? 'page' : undefined}
          data-testid='desktop-nav-settings'
          onClick={goToSettings}
        >
          <SettingsIcon size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </button>
      </nav>
    </aside>
  )
}
