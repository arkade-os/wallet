import { ReactNode, createContext, useEffect, useState } from 'react'
import { clearStorage, readConfigFromStorage, saveConfigToStorage } from '../lib/storage'
import { defaultArkServer } from '../lib/constants'
import { Config, Themes, Unit } from '../lib/types'

const defaultConfig: Config = {
  aspUrl: defaultArkServer(),
  nostr: false,
  notifications: false,
  npub: '',
  showBalance: true,
  showFiat: false,
  theme: Themes.Dark,
  unit: Unit.BTC,
}

interface ConfigContextProps {
  config: Config
  configLoaded: boolean
  resetConfig: () => void
  showConfig: boolean
  toggleShowConfig: () => void
  updateConfig: (c: Config) => void
}

export const ConfigContext = createContext<ConfigContextProps>({
  config: defaultConfig,
  configLoaded: false,
  resetConfig: () => {},
  showConfig: false,
  toggleShowConfig: () => {},
  updateConfig: () => {},
})

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const toggleShowConfig = () => setShowConfig(!showConfig)

  const preferredTheme = () =>
    window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? Themes.Dark : Themes.Light

  const updateConfig = (data: Config) => {
    setConfig(data)
    updateTheme(data)
    saveConfigToStorage(data)
  }

  const updateTheme = ({ theme }: Config) => {
    const darkPalette = 'ion-palette-dark'
    const root = document.documentElement
    if (theme === Themes.Dark) root.classList.add(darkPalette)
    else root.classList.remove(darkPalette)
  }

  const resetConfig = () => {
    clearStorage()
    updateConfig(defaultConfig)
  }

  useEffect(() => {
    if (configLoaded) return
    if (window.location.hash === '#localhost') {
      defaultConfig.aspUrl = 'http://localhost:7070'
      window.location.hash = ''
    }
    const config = readConfigFromStorage() ?? { ...defaultConfig, theme: preferredTheme() }
    updateConfig(config)
    setConfigLoaded(true)
  }, [configLoaded])

  return (
    <ConfigContext.Provider value={{ config, configLoaded, resetConfig, showConfig, toggleShowConfig, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}
