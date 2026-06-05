import { useContext } from 'react'
import Lock from './Lock'
import Notifications from './Notifications'
import Backup from './Backup'
import Reset from './Reset'
import About from './About'
import Vtxos from './Vtxos'
import NotesForm from '../Wallet/Notes/Form'
import Server from './Server'
import Support from './Support'
import { OptionsContext } from '../../providers/options'
import SettingsMenu from './Menu'
import Logs from './Logs'
import { SettingsOptions } from '../../lib/types'
import Advanced from './Advanced'
import General from './General'
import Theme from './Theme'
import Fiat from './Fiat'
import Display from './Display'
import Password from './Password'
import Delegates from './Delegates'
import SettingsPageTransition from '../../components/SettingsPageTransition'
import Haptics from './Haptics'
import Contracts from './Contracts'
import { NavigationContext, Pages } from '../../providers/navigation'

function settingsContent(option: SettingsOptions, menuBack?: () => void): JSX.Element {
  switch (option) {
    case SettingsOptions.Menu:
      return <SettingsMenu backFunc={menuBack} />
    case SettingsOptions.About:
      return <About />
    case SettingsOptions.Advanced:
      return <Advanced />
    case SettingsOptions.Backup:
      return <Backup />
    case SettingsOptions.Contracts:
      return <Contracts />
    case SettingsOptions.Delegates:
      return <Delegates />
    case SettingsOptions.BitcoinUnit:
      return <Display />
    case SettingsOptions.Display:
      return <General />
    case SettingsOptions.Currency:
      return <Fiat />
    case SettingsOptions.Haptics:
      return <Haptics />
    case SettingsOptions.Lock:
      return <Lock />
    case SettingsOptions.Logs:
      return <Logs />
    case SettingsOptions.Notes:
      return <NotesForm />
    case SettingsOptions.Notifications:
      return <Notifications />
    case SettingsOptions.Password:
      return <Password />
    case SettingsOptions.Reset:
      return <Reset />
    case SettingsOptions.Server:
      return <Server />
    case SettingsOptions.Support:
      return <Support />
    case SettingsOptions.Theme:
      return <Theme />
    case SettingsOptions.Vtxos:
      return <Vtxos />
    default:
      return <></>
  }
}

export default function Settings() {
  const { option, direction } = useContext(OptionsContext)
  const { goBack: navigationBack, screen } = useContext(NavigationContext)
  const menuBack = screen === Pages.WalletSettings ? navigationBack : undefined

  return (
    <SettingsPageTransition direction={direction} optionKey={String(option)}>
      {settingsContent(option, menuBack)}
    </SettingsPageTransition>
  )
}
