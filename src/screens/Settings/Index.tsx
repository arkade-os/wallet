import { useContext } from 'react'
import Lock from './Lock'
import Notifications from './Notifications'
import Backup from './Backup'
import Reset from './Reset'
import About from './About'
import Vtxos from './Vtxos'
import NotesForm from '../Wallet/Notes/Form'
import Server from './Server'
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

export default function Settings() {
  const { option } = useContext(OptionsContext)

  return (
    <>
      {option === SettingsOptions.Menu && <SettingsMenu />}
      {option === SettingsOptions.About && <About />}
      {option === SettingsOptions.Advanced && <Advanced />}
      {option === SettingsOptions.Backup && <Backup />}
      {option === SettingsOptions.General && <General />}
      {option === SettingsOptions.Lock && <Lock />}
      {option === SettingsOptions.Logs && <Logs />}
      {option === SettingsOptions.Notes && <NotesForm />}
      {option === SettingsOptions.Notifications && <Notifications />}
      {option === SettingsOptions.Reset && <Reset />}
      {option === SettingsOptions.Server && <Server />}
      {option === SettingsOptions.Vtxos && <Vtxos />}
      {option === SettingsOptions.Theme && <Theme />}
      {option === SettingsOptions.Fiat && <Fiat />}
      {option === SettingsOptions.Display && <Display />}
      {option === SettingsOptions.Password && <Password />}
    </>
  )
}
