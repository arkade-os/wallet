import { ReactNode, createContext, useEffect, useState } from 'react'
import { clearStorage, readConfigFromStorage, saveConfigToStorage } from '../lib/storage'
import { defaultArkServer } from '../lib/constants'
import { Config, CurrencyDisplay, Fiats, Themes, Unit } from '../lib/types'

const defaultConfig: Config = {
  aspUrl: defaultArkServer(),
  currencyDisplay: CurrencyDisplay.Both,
  fiat: Fiats.USD,
  nostr: false,
  notifications: false,
  npub: '',
  showBalance: true,
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
    if (!config.fiat) config.fiat = defaultConfig.fiat
    if (!config.currencyDisplay) config.currencyDisplay = defaultConfig.currencyDisplay
    updateConfig(config)
    setConfigLoaded(true)
  }, [configLoaded])

  return (
    <ConfigContext.Provider value={{ config, configLoaded, resetConfig, showConfig, toggleShowConfig, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}
