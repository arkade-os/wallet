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
import Display from './Display'
import Theme from './Theme'
import Currency from './Currency'
import BitcoinUnit from './BitcoinUnit'
import Password from './Password'
import Delegates from './Delegates'
import SettingsPageTransition from '../../components/SettingsPageTransition'
import Haptics from './Haptics'
import Contracts from './Contracts'
import Solvers from './Solvers'

function settingsContent(option: SettingsOptions): JSX.Element {
  switch (option) {
    case SettingsOptions.Menu:
      return <SettingsMenu />
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
      return <BitcoinUnit />
    case SettingsOptions.Display:
      return <Display />
    case SettingsOptions.Currency:
      return <Currency />
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
    case SettingsOptions.Solvers:
      return <Solvers />
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

  return (
    <SettingsPageTransition direction={direction} optionKey={String(option)}>
      {settingsContent(option)}
    </SettingsPageTransition>
  )
}
