import { fromRuntimeEnv } from './constants'
import { consoleError } from './logs'
import { Language } from './types'

export interface ChatwootSDK {
  setUser: (identifier: string, user: { name?: string; email?: string; avatar_url?: string }) => void
  setCustomAttributes: (attributes: Record<string, string | number | boolean>) => void
  toggleBubbleVisibility: (state: 'show' | 'hide') => void
  toggle: (state: 'open' | 'close') => void
  setLocale?: (locale: string) => void
}

// Define the types for the global window object
declare global {
  interface Window {
    $chatwoot: ChatwootSDK
    chatwootSDK: {
      run: (vars: ChatwootVars) => void
      setLocale?: (locale: string) => void
    }
    chatwootSettings: {
      [key: string]: any
    }
  }
}

export interface ChatwootVars {
  websiteToken: string
  baseUrl: string
}

export const getChatwootVars = (): ChatwootVars => {
  return {
    websiteToken: fromRuntimeEnv(import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN) ?? '',
    baseUrl: fromRuntimeEnv(import.meta.env.VITE_CHATWOOT_BASE_URL) ?? '',
  }
}

export const hasChatwootVars = (): boolean => {
  const { websiteToken, baseUrl } = getChatwootVars()
  return Boolean(websiteToken && baseUrl)
}

export interface ChatwootSettings {
  hideMessageBubble: boolean
  position: 'left' | 'right'
  darkMode: 'auto' | 'light'
  locale: string
}

export const getChatwootLocale = (language: Language): string => (language === Language.Spanish ? 'es' : 'en')

export const getChatwootSettings = (locale = 'en'): ChatwootSettings => {
  return {
    hideMessageBubble: false,
    position: 'right',
    darkMode: 'auto',
    locale,
  }
}

/**
 *
 * @param settings
 */
export const injectAndRunChatwootScript = (vars: ChatwootVars) => {
  ;(function (d, t) {
    const g = d.createElement(t) as HTMLScriptElement
    const s = d.getElementsByTagName(t)[0] as HTMLScriptElement
    g.src = `${vars.baseUrl}/packs/js/sdk.js`
    g.defer = true
    g.async = true
    if (!s.parentNode) {
      consoleError('Cannot inject Chatwoot script: parent node not found')
      return
    }
    s.parentNode.insertBefore(g, s)
    g.onload = () => {
      const period = 100 // in ms
      let elapsedTime = 0
      const checkSDK = setInterval(() => {
        elapsedTime += period
        if (window.chatwootSDK) {
          clearInterval(checkSDK)
          window.chatwootSDK.run(vars)
        }
        // Timeout after 5 seconds
        if (elapsedTime >= 5000) {
          clearInterval(checkSDK)
          consoleError('Chatwoot SDK failed to load within 5 seconds')
        }
      }, 100)
    }
  })(document, 'script')
}

/**
 * Push a locale to an already-loaded Chatwoot widget. Both handles are tried
 * defensively across SDK versions; no-op when the widget is not present.
 */
export const setChatwootLocale = (locale: string): void => {
  window.chatwootSDK?.setLocale?.(locale)
  window.$chatwoot?.setLocale?.(locale)
}
