export interface ChatwootSDK {
  setUser: (identifier: string, user: { name?: string; email?: string; avatar_url?: string }) => void
  setCustomAttributes: (attributes: Record<string, string | number | boolean>) => void
  toggleBubbleVisibility: (state: 'show' | 'hide') => void
  toggle: (state: 'open' | 'close') => void
}

// Define the types for the global window object
declare global {
  interface Window {
    $chatwoot: ChatwootSDK
    chatwootSDK: {
      run: (vars: ChatwootVars) => void
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
    websiteToken: import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN,
    baseUrl: import.meta.env.VITE_CHATWOOT_BASE_URL,
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

export const getChatwootSettings = (): ChatwootSettings => {
  return {
    hideMessageBubble: false,
    position: 'right',
    darkMode: 'auto',
    locale: 'en',
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
      console.error('Cannot inject Chatwoot script: parent node not found')
      return
    }
    s.parentNode.insertBefore(g, s)
    g.onload = () => {
      const checkSDK = setInterval(() => {
        if (window.chatwootSDK) {
          clearInterval(checkSDK)
          window.chatwootSDK.run(vars)
        }
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkSDK), 5000)
      }, 100)
    }
  })(document, 'script')
}
