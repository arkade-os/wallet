import { ReactElement, ReactNode, createContext, useCallback, useEffect, useRef, useState } from 'react'
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
import { isButtonBack, subNavHandler } from './navigation'
import CogIcon from '../icons/Cog'
import LockIcon from '../icons/Lock'
import PuzzleIcon from '../icons/Puzzle'
import CoinsIcon from '../icons/Coins'
import HashIcon from '../icons/Hash'
import SwapIcon from '../icons/Swap'

export interface Option {
  icon: ReactElement
  option: SettingsOptions
  section: SettingsSections
}

export const options: Option[] = [
  {
    icon: <CoinsIcon />,
    option: SettingsOptions.ArkadeMint,
    section: SettingsSections.Advanced,
  },
  {
    icon: <SwapIcon />,
    option: SettingsOptions.Boltz,
    section: SettingsSections.Advanced,
  },
  {
    icon: <LockIcon />,
    option: SettingsOptions.Password,
    section: SettingsSections.Advanced,
  },
  {
    icon: <VtxosIcon />,
    option: SettingsOptions.Vtxos,
    section: SettingsSections.Advanced,
  },
  {
    icon: <HashIcon />,
    option: SettingsOptions.Contracts,
    section: SettingsSections.Advanced,
  },
  {
    icon: <ServerIcon />,
    option: SettingsOptions.Delegates,
    section: SettingsSections.Advanced,
  },
  {
    icon: <LogsIcon />,
    option: SettingsOptions.Logs,
    section: SettingsSections.Advanced,
  },
  {
    icon: <ServerIcon />,
    option: SettingsOptions.Server,
    section: SettingsSections.Advanced,
  },
  {
    icon: <InfoIcon />,
    option: SettingsOptions.About,
    section: SettingsSections.Display,
  },
  {
    icon: <PuzzleIcon />,
    option: SettingsOptions.Advanced,
    section: SettingsSections.Display,
  },
  {
    icon: <CogIcon />,
    option: SettingsOptions.Display,
    section: SettingsSections.Display,
  },
  {
    icon: <NotesIcon />,
    option: SettingsOptions.Notes,
    section: SettingsSections.Display,
  },
  {
    icon: <NotificationIcon />,
    option: SettingsOptions.Notifications,
    section: SettingsSections.Display,
  },
  {
    icon: <SupportIcon />,
    option: SettingsOptions.Support,
    section: SettingsSections.Display,
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
    icon: <ResetIcon />,
    option: SettingsOptions.Reset,
    section: SettingsSections.Security,
  },
  {
    icon: <></>,
    option: SettingsOptions.BitcoinUnit,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Currency,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Haptics,
    section: SettingsSections.Config,
  },
  {
    icon: <></>,
    option: SettingsOptions.Theme,
    section: SettingsSections.Config,
  },
]

export interface SectionResponse {
  section: SettingsSections
  options: Option[]
}

const allOptions: SectionResponse[] = [SettingsSections.Display, SettingsSections.Security].map((section) => {
  return {
    section,
    options: options.filter((o) => o.section === section),
  }
})

export type SettingsDirection = 'forward' | 'back' | 'none'

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

  const optionRef = useRef(SettingsOptions.Menu)
  const historyDepth = useRef(0)

  const optionSection = (opt: SettingsOptions): SettingsSections => {
    return options.find((o) => o.option === opt)?.section || SettingsSections.Display
  }

  const getParentOption = (current: SettingsOptions): SettingsOptions => {
    const section = optionSection(current)
    return section === SettingsSections.Advanced
      ? SettingsOptions.Advanced
      : section === SettingsSections.Config
        ? SettingsOptions.Display
        : SettingsOptions.Menu
  }

  // Internal goBack — called by popstate handler via subNavHandler, does NOT touch browser history
  const internalGoBack = useCallback((fromButton: boolean) => {
    setDirection(fromButton ? 'back' : 'none')
    const target = getParentOption(optionRef.current)
    if (historyDepth.current > 0) historyDepth.current--
    optionRef.current = target
    setOption(target)
  }, [])

  const navigateToOption = useCallback((o: SettingsOptions) => {
    if (o === SettingsOptions.Menu) {
      // Reset to menu — don't push history (caller handles history cleanup)
      historyDepth.current = 0
      optionRef.current = SettingsOptions.Menu
      setDirection('back')
      setOption(SettingsOptions.Menu)
      return
    }
    setDirection('forward')
    history.pushState({}, '', '')
    historyDepth.current++
    optionRef.current = o
    setOption(o)
  }, [])

  // Public goBack — called by back button in Settings header
  const goBack = useCallback(() => {
    if (optionRef.current !== SettingsOptions.Menu) {
      isButtonBack.current = true
      history.back() // triggers popstate → NavigationProvider delegates to internalGoBack
    }
  }, [])

  // Register with sub-nav handler so NavigationProvider can coordinate
  useEffect(() => {
    subNavHandler.canGoBack = () => optionRef.current !== SettingsOptions.Menu
    subNavHandler.goBack = (fromButton: boolean) => internalGoBack(fromButton)
    subNavHandler.getDepth = () => historyDepth.current
    subNavHandler.reset = () => {
      historyDepth.current = 0
      optionRef.current = SettingsOptions.Menu
      setOption(SettingsOptions.Menu)
    }
    return () => {
      subNavHandler.canGoBack = () => false
      subNavHandler.goBack = () => {}
      subNavHandler.getDepth = () => 0
      subNavHandler.reset = () => {}
    }
  }, [internalGoBack])

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
