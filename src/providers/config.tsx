import { ReactNode, createContext, useEffect, useState } from 'react'
import { clearStorage, readConfigFromStorage, saveConfigToStorage } from '../lib/storage'
import { defaultArkServer } from '../lib/constants'
import { Config, CurrencyDisplay, Fiats, Themes, Unit } from '../lib/types'
import { BackupProvider } from '../lib/backup'
import { consoleError } from '../lib/logs'
import { setHapticsEnabled } from '../lib/haptics'

const defaultConfig: Config = {
  announcementsSeen: [],
  apps: { boltz: { connected: true } },
  aspUrl: defaultArkServer(),
  currencyDisplay: CurrencyDisplay.Both,
  fiat: Fiats.USD,
  importedAssets: [],
  haptics: true,
  nostrBackup: false,
  notifications: false,
  pubkey: '',
  showBalance: true,
  theme: Themes.Auto,
  unit: Unit.BTC,
}

interface ConfigContextProps {
  backupConfig: (c: Config) => Promise<void>
  config: Config
  configLoaded: boolean
  effectiveTheme: Themes.Dark | Themes.Light
  resetConfig: () => void
  setConfig: (c: Config) => void
  showConfig: boolean
  systemTheme: Themes.Dark | Themes.Light
  toggleShowConfig: () => void
  updateConfig: (c: Config) => void
  useFiat: boolean
}

export const ConfigContext = createContext<ConfigContextProps>({
  backupConfig: async () => {},
  config: defaultConfig,
  configLoaded: false,
  effectiveTheme: Themes.Dark,
  resetConfig: () => {},
  setConfig: () => {},
  showConfig: false,
  systemTheme: Themes.Dark,
  toggleShowConfig: () => {},
  updateConfig: () => {},
  useFiat: false,
})

export const resolveTheme = (theme: Themes): Themes.Dark | Themes.Light => {
  if (theme === Themes.Auto) {
    return window?.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? Themes.Dark : Themes.Light
  }
  return theme as Themes.Dark | Themes.Light
}

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [effectiveTheme, setEffectiveTheme] = useState<Themes.Dark | Themes.Light>(() =>
    resolveTheme(defaultConfig.theme),
  )
  const [systemTheme, setSystemTheme] = useState<Themes.Dark | Themes.Light>(() => resolveTheme(Themes.Auto))

  const backupConfig = async (config: Config) => {
    const backupProvider = new BackupProvider({ pubkey: config.pubkey })
    await backupProvider.backupConfig(config).catch((error) => {
      consoleError(error, 'Backup to Nostr failed')
    })
  }

  const toggleShowConfig = () => setShowConfig(!showConfig)

  const applyTheme = (theme: Themes) => {
    const resolved = resolveTheme(theme)
    setEffectiveTheme(resolved)
    const darkPalette = 'ion-palette-dark'
    const root = document.documentElement
    if (resolved === Themes.Dark) root.classList.add(darkPalette)
    else root.classList.remove(darkPalette)
  }

  const updateConfig = async (config: Config) => {
    // add protocol to aspUrl if missing
    if (!config.aspUrl.startsWith('http://') && !config.aspUrl.startsWith('https://')) {
      const protocol = config.aspUrl.startsWith('localhost') ? 'http://' : 'https://'
      config.aspUrl = protocol + config.aspUrl
    }
    setConfig(config)
    applyTheme(config.theme)
    setHapticsEnabled(config.haptics)
    saveConfigToStorage(config)
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
    let config = readConfigFromStorage() ?? { ...defaultConfig }
    // allow upgradability
    config = { ...defaultConfig, ...config }
    // env var is authoritative — override cached localStorage value
    if (import.meta.env.VITE_ARK_SERVER) config.aspUrl = import.meta.env.VITE_ARK_SERVER
    updateConfig(config)
    setConfigLoaded(true)
  }, [configLoaded])

  // always track system theme; apply it when Auto is selected
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      setSystemTheme(resolveTheme(Themes.Auto))
      if (config.theme === Themes.Auto) applyTheme(Themes.Auto)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [config.theme])

  const useFiat = config.currencyDisplay === CurrencyDisplay.Fiat

  return (
    <ConfigContext.Provider
      value={{
        backupConfig,
        config,
        configLoaded,
        effectiveTheme,
        resetConfig,
        setConfig,
        showConfig,
        systemTheme,
        toggleShowConfig,
        updateConfig,
        useFiat,
      }}
    >
      {children}
    </ConfigContext.Provider>
  )
}
