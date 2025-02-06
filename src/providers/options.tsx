import { ReactElement, ReactNode, createContext, useState } from 'react'
import BackupIcon from '../icons/Backup'
import AppearanceIcon from '../icons/Appearance'
import InfoIcon from '../icons/Info'
import LockIcon from '../icons/Lock'
import NostrIcon from '../icons/Nostr'
import NotificationIcon from '../icons/Notification'
import ResetIcon from '../icons/Reset'
import NoteIcon from '../icons/Note'
import VtxosIcon from '../icons/Vtxos'
import ServerIcon from '../icons/Server'
import LogsIcon from '../icons/Logs'
import { SettingsOptions, SettingsSections } from '../lib/types'

interface Option {
  icon: ReactElement
  option: SettingsOptions
  section: SettingsSections
}

const options: Option[] = [
  {
    icon: <InfoIcon />,
    option: SettingsOptions.About,
    section: SettingsSections.General,
  },
  {
    icon: <AppearanceIcon />,
    option: SettingsOptions.Appearance,
    section: SettingsSections.General,
  },
  {
    icon: <BackupIcon />,
    option: SettingsOptions.Backup,
    section: SettingsSections.Security,
  },
  {
    icon: <LockIcon />,
    option: SettingsOptions.Lock,
    section: SettingsSections.Security,
  },
  {
    icon: <LogsIcon />,
    option: SettingsOptions.Logs,
    section: SettingsSections.Advanced,
  },
  {
    icon: <NostrIcon />,
    option: SettingsOptions.Nostr,
    section: SettingsSections.General,
  },
  {
    icon: <NoteIcon />,
    option: SettingsOptions.Notes,
    section: SettingsSections.General,
  },
  {
    icon: <NotificationIcon />,
    option: SettingsOptions.Notifications,
    section: SettingsSections.General,
  },
  {
    icon: <ResetIcon />,
    option: SettingsOptions.Reset,
    section: SettingsSections.Security,
  },
  {
    icon: <ServerIcon />,
    option: SettingsOptions.Server,
    section: SettingsSections.Advanced,
  },
  {
    icon: <VtxosIcon />,
    option: SettingsOptions.Vtxos,
    section: SettingsSections.Advanced,
  },
]

interface SectionResponse {
  section: SettingsSections
  options: Option[]
}

const allOptions: SectionResponse[] = [
  SettingsSections.General,
  SettingsSections.Security,
  SettingsSections.Advanced,
].map((section) => {
  return {
    section,
    options: options.filter((o) => o.section === section),
  }
})

interface OptionsContextProps {
  option: SettingsOptions
  goBack: () => void
  setOption: (o: SettingsOptions) => void
  validOptions: () => SectionResponse[]
}

export const OptionsContext = createContext<OptionsContextProps>({
  option: SettingsOptions.Menu,
  goBack: () => {},
  setOption: () => {},
  validOptions: () => [],
})

export const OptionsProvider = ({ children }: { children: ReactNode }) => {
  const [option, setOption] = useState(SettingsOptions.Menu)

  const goBack = () => setOption(SettingsOptions.Menu)

  const validOptions = (): SectionResponse[] => {
    return allOptions
  }

  return (
    <OptionsContext.Provider
      value={{
        option,
        goBack,
        setOption,
        validOptions,
      }}
    >
      {children}
    </OptionsContext.Provider>
  )
}
