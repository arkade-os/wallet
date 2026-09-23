import { ReactNode, createContext, useContext, useEffect } from 'react'
import { Language, SettingsOptions } from '../lib/types'
import { detectLanguage, setActiveLanguage } from '../lib/language'
import { translate } from '../lib/i18n'
import { ConfigContext } from './config'

export { translate, getTranslationDict } from '../lib/i18n'

export type LanguageContextProps = {
  language: Language
  t: (key: string, params?: Record<string, string | number>) => string
}

export const LanguageContext = createContext<LanguageContextProps>({
  language: Language.English,
  t: (key: string, params?: Record<string, string | number>) => translate(Language.English, key, params),
})

export function useLanguage() {
  const { language, t } = useContext(LanguageContext)
  return { language, t }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { config } = useContext(ConfigContext)
  const language = config?.language ?? detectLanguage()
  const t = (key: string, params?: Record<string, string | number>) => translate(language, key, params)

  // Keep the non-React mirror in sync so lib/error.ts localizes server messages.
  useEffect(() => {
    setActiveLanguage(language)
  }, [language])

  return <LanguageContext.Provider value={{ language, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  const { language, t } = useContext(LanguageContext)
  return { language, t }
}

const SETTINGS_OPTION_KEY: Record<SettingsOptions, string> = {
  [SettingsOptions.Menu]: 'settings.title',
  [SettingsOptions.About]: 'settings.about',
  [SettingsOptions.Advanced]: 'settings.advanced',
  [SettingsOptions.ArkadeMint]: 'settings.arkadeMint',
  [SettingsOptions.Backup]: 'settings.backup',
  [SettingsOptions.BitcoinUnit]: 'settings.bitcoinUnit',
  [SettingsOptions.Contracts]: 'settings.contracts',
  [SettingsOptions.Currency]: 'settings.currency',
  [SettingsOptions.Delegates]: 'settings.delegates',
  [SettingsOptions.Display]: 'settings.display',
  [SettingsOptions.General]: 'settings.general',
  [SettingsOptions.Haptics]: 'settings.hapticFeedback',
  [SettingsOptions.Lock]: 'settings.lock',
  [SettingsOptions.Logs]: 'settings.logs',
  [SettingsOptions.Language]: 'settings.language',
  [SettingsOptions.Notifications]: 'settings.notifications',
  [SettingsOptions.Notes]: 'settings.notes',
  [SettingsOptions.Password]: 'settings.changePassword',
  [SettingsOptions.Reset]: 'settings.resetWallet',
  [SettingsOptions.Server]: 'settings.server',
  [SettingsOptions.Solvers]: 'settings.solvers',
  [SettingsOptions.Support]: 'settings.support',
  [SettingsOptions.Theme]: 'settings.theme',
  [SettingsOptions.Vtxos]: 'settings.vtxos',
}

export function getSettingsOptionLabel(language: Language, option: SettingsOptions): string {
  const key = SETTINGS_OPTION_KEY[option]
  const translated = translate(language, key)
  return translated === key ? option : translated
}
