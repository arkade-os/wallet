import { ReactNode, createContext, useEffect, useState } from 'react'
import { clearStorage, readConfigFromStorage, saveConfigToStorage } from '../lib/storage'
import { defaultArkServer } from '../lib/constants'
import { Config, CurrencyDisplay, Fiats, Themes, Unit } from '../lib/types'
import { BackupProvider } from '../lib/backup'
import { consoleError } from '../lib/logs'
import { setHapticsEnabled } from '../lib/haptics'
import { IndexedDbSwapRepository } from '@arkade-os/boltz-swap'

const defaultConfig: Config = {
  announcementsSeen: [],
  apps: { assets: { enabled: false }, boltz: { connected: true } },
  aspUrl: defaultArkServer(),
  dismissedBanners: [],
  currencyDisplay: CurrencyDisplay.Fiat,
  delegate: import.meta.env.VITE_DELEGATE_ENABLED !== 'false',
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

const updateDefaultConfig = (config: Partial<Config>): Config => {
  // Ad-hoc merge keeps defaults immutable and documents per-field semantics.
  // Arrays are replaced (not concatenated) and nested objects are rebuilt so we don't
  // leak references between sessions when the stored config is partial.
  const announcementsSeen = Array.isArray(config.announcementsSeen)
    ? config.announcementsSeen
    : defaultConfig.announcementsSeen
  const importedAssets = Array.isArray(config.importedAssets) ? config.importedAssets : defaultConfig.importedAssets
  return {
    ...defaultConfig,
    ...config,
    announcementsSeen: [...announcementsSeen],
    importedAssets: [...importedAssets],
    apps: {
      assets: { enabled: config.apps?.assets?.enabled ?? defaultConfig.apps.assets.enabled },
      boltz: { connected: config.apps?.boltz?.connected ?? defaultConfig.apps.boltz.connected },
    },
  }
}

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
    const backupProvider = new BackupProvider({ pubkey: config.pubkey }, new IndexedDbSwapRepository())
    await backupProvider.backupConfig(config).catch((error) => {
      consoleError(error, 'Backup to Nostr failed')
    })
  }

  const toggleShowConfig = () => setShowConfig(!showConfig)

  const applyTheme = (theme: Themes) => {
    const resolved = resolveTheme(theme)
    setEffectiveTheme(resolved)
    const darkPalette = 'palette-dark'
    const root = document.documentElement
    if (resolved === Themes.Dark) root.classList.add(darkPalette)
    else root.classList.remove(darkPalette)

    const themeColor = resolved === Themes.Dark ? '#101010' : '#fff'
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', themeColor)
  }

  const updateConfig = async (incoming: Config) => {
    // merge with defaults so newly added fields are always present
    const config = updateDefaultConfig(incoming)
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
    // merge with defaults to ensure all fields are present
    config = updateDefaultConfig(config)
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
