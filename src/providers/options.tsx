import { ReactElement, ReactNode, createContext, useCallback, useState } from 'react'
import BackupIcon from '../icons/Backup'
import InfoIcon from '../icons/Info'
import NotificationIcon from '../icons/Notification'
import ResetIcon from '../icons/Reset'
import NotesIcon from '../icons/Notes'
import VtxosIcon from '../icons/Vtxos'
import ServerIcon from '../icons/Server'
import LogsIcon from '../icons/Logs'
import SupportIcon from '../icons/Support'
import { SettingsOptions, SettingsSections } from '../lib/types'
import CogIcon from '../icons/Cog'
import LockIcon from '../icons/Lock'
import PuzzleIcon from '../icons/Puzzle'

export interface Option {
  icon: ReactElement
  option: SettingsOptions
  section: SettingsSections
}

export const options: Option[] = [
  {
    icon: <InfoIcon />,
    option: SettingsOptions.About,
    section: SettingsSections.General,
  },
  {
    icon: <PuzzleIcon />,
    option: SettingsOptions.Advanced,
    section: SettingsSections.Security,
  },
  {
    icon: <BackupIcon />,
    option: SettingsOptions.Backup,
    section: SettingsSections.Security,
  },
  {
    icon: <CogIcon />,
    option: SettingsOptions.General,
    section: SettingsSections.General,
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
    icon: <NotesIcon />,
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
    icon: <SupportIcon />,
    option: SettingsOptions.Support,
    section: SettingsSections.General,
  },
  {
    icon: <></>,
    option: SettingsOptions.Delegates,
    section: SettingsSections.Advanced,
  },
  {
    icon: <VtxosIcon />,
    option: SettingsOptions.Vtxos,
    section: SettingsSections.Advanced,
  },
  {
    icon: <></>,
    option: SettingsOptions.Theme,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Fiat,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Display,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Haptics,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Password,
    section: SettingsSections.Advanced,
  },
]

export interface SectionResponse {
  section: SettingsSections
  options: Option[]
}

const allOptions: SectionResponse[] = [SettingsSections.General, SettingsSections.Security].map((section) => {
  return {
    section,
    options: options.filter((o) => o.section === section),
  }
})

export type SettingsDirection = 'forward' | 'back'

interface OptionsContextProps {
  direction: SettingsDirection
  option: SettingsOptions
  options: Option[]
  goBack: () => void
  setOption: (o: SettingsOptions) => void
  validOptions: () => SectionResponse[]
}

export const OptionsContext = createContext<OptionsContextProps>({
  direction: 'forward',
  option: SettingsOptions.Menu,
  options: [],
  goBack: () => {},
  setOption: () => {},
  validOptions: () => [],
})

export const OptionsProvider = ({ children }: { children: ReactNode }) => {
  const [option, setOption] = useState(SettingsOptions.Menu)
  const [direction, setDirection] = useState<SettingsDirection>('forward')

  const optionSection = (opt: SettingsOptions): SettingsSections => {
    return options.find((o) => o.option === opt)?.section || SettingsSections.General
  }

  const navigateToOption = useCallback(
    (o: SettingsOptions) => {
      setDirection('forward')
      setOption(o)
    },
    [setOption],
  )

  const goBack = useCallback(() => {
    setDirection('back')
    setOption((current) => {
      const section = optionSection(current)
      return section === SettingsSections.Advanced
        ? SettingsOptions.Advanced
        : section === SettingsSections.Config
          ? SettingsOptions.General
          : SettingsOptions.Menu
    })
  }, [setOption])

  const validOptions = (): SectionResponse[] => {
    return allOptions
  }

  return (
    <OptionsContext.Provider
      value={{
        direction,
        option,
        options,
        goBack,
        setOption: navigateToOption,
        validOptions,
      }}
    >
      {children}
    </OptionsContext.Provider>
  )
}
