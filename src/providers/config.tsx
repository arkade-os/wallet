import { ReactNode, createContext, useEffect, useState } from 'react'
import { clearStorage, readConfigFromStorage, saveConfigToStorage } from '../lib/storage'
import { defaultArkServer } from '../lib/constants'
import { Config, CurrencyDisplay, Fiats, Themes, Unit } from '../lib/types'

const defaultConfig: Config = {
  apps: { boltz: { connected: true } },
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
  setConfig: (c: Config) => void
  showConfig: boolean
  toggleShowConfig: () => void
  updateConfig: (c: Config) => void
  useFiat: boolean
}

export const ConfigContext = createContext<ConfigContextProps>({
  config: defaultConfig,
  configLoaded: false,
  resetConfig: () => {},
  setConfig: () => {},
  showConfig: false,
  toggleShowConfig: () => {},
  updateConfig: () => {},
  useFiat: false,
})

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const toggleShowConfig = () => setShowConfig(!showConfig)

  const preferredTheme = () =>
    window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? Themes.Dark : Themes.Light

  const updateConfig = (data: Config) => {
    if (!data.aspUrl.startsWith('http://') && !data.aspUrl.startsWith('https://')) {
      const protocol = data.aspUrl.startsWith('localhost') ? 'http://' : 'https://'
      data.aspUrl = protocol + data.aspUrl
    }
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

  const resetConfig = async () => {
    await clearStorage()
    updateConfig(defaultConfig)
  }

  useEffect(() => {
    if (configLoaded) return
    if (window.location.hash === '#localhost') {
      defaultConfig.aspUrl = 'http://localhost:7070'
      window.location.hash = ''
    }
    let config = readConfigFromStorage() ?? { ...defaultConfig, theme: preferredTheme() }
    // allow upgradability
    config = { ...defaultConfig, ...config }
    updateConfig(config)
    setConfigLoaded(true)
  }, [configLoaded])

  const useFiat = config.currencyDisplay === CurrencyDisplay.Fiat

  return (
    <ConfigContext.Provider
      value={{ config, configLoaded, resetConfig, setConfig, showConfig, toggleShowConfig, updateConfig, useFiat }}
    >
      {children}
    </ConfigContext.Provider>
  )
}
