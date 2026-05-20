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
import AppAssets from '../Apps/Assets/Index'

function settingsContent(option: SettingsOptions, menuBack?: () => void, settingsMenuBack?: () => void): JSX.Element {
  switch (option) {
    case SettingsOptions.Menu:
      return <SettingsMenu backFunc={menuBack} />
    case SettingsOptions.About:
      return <About />
    case SettingsOptions.Advanced:
      return <Advanced />
    case SettingsOptions.ArkadeMint:
      return <AppAssets back={settingsMenuBack} />
    case SettingsOptions.Backup:
      return <Backup />
    case SettingsOptions.Delegates:
      return <Delegates />
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
    case SettingsOptions.Contracts:
      return <Contracts />
    case SettingsOptions.Theme:
      return <Theme />
    case SettingsOptions.Fiat:
      return <Fiat />
    case SettingsOptions.Display:
      return <Display />
    case SettingsOptions.Password:
      return <Password />
    case SettingsOptions.Haptics:
      return <Haptics />
    default:
      return <></>
  }
}

export default function Settings() {
  const { option, direction, setOption } = useContext(OptionsContext)
  const { goBack: navigationBack, screen } = useContext(NavigationContext)
  const menuBack = screen === Pages.WalletSettings ? navigationBack : undefined
  const settingsMenuBack = () => setOption(SettingsOptions.Menu)

  return (
    <SettingsPageTransition direction={direction} optionKey={String(option)}>
      {settingsContent(option, menuBack, settingsMenuBack)}
    </SettingsPageTransition>
  )
}
