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
import SettingsPageTransition from '../../components/SettingsPageTransition'

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
    case SettingsOptions.General:
      return <General />
    case SettingsOptions.Lock:
      return <Lock />
    case SettingsOptions.Logs:
      return <Logs />
    case SettingsOptions.Notes:
      return <NotesForm />
    case SettingsOptions.Notifications:
      return <Notifications />
    case SettingsOptions.Reset:
      return <Reset />
    case SettingsOptions.Server:
      return <Server />
    case SettingsOptions.Support:
      return <Support />
    case SettingsOptions.Vtxos:
      return <Vtxos />
    case SettingsOptions.Theme:
      return <Theme />
    case SettingsOptions.Fiat:
      return <Fiat />
    case SettingsOptions.Display:
      return <Display />
    case SettingsOptions.Password:
      return <Password />
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
