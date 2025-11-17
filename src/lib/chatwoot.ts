import { useEffect, useRef } from 'react'

export interface ChatwootConfig {
  websiteToken: string
  baseUrl: string
}

export interface ChatwootSDK {
  run: (config: { websiteToken: string; baseUrl: string }) => void
  toggle: (state?: 'open' | 'close') => void
  setUser: (identifier: string, user: { name?: string; email?: string; avatar_url?: string }) => void
  setCustomAttributes: (attributes: Record<string, string | number | boolean>) => void
  deleteUser: () => void
  setLabel: (label: string) => void
  removeLabel: (label: string) => void
  setLocale: (locale: string) => void
  reset: () => void
}

declare global {
  interface Window {
    $chatwoot?: ChatwootSDK
    chatwootSettings?: {
      hideMessageBubble?: boolean
      position?: 'left' | 'right'
      locale?: string
      darkMode?: 'light' | 'auto'
      type?: 'standard' | 'expanded_bubble'
    }
  }
}

/**
 * Loads the Chatwoot widget script
 */
export function loadChatwootScript(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.getElementById('chatwoot-script')) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.id = 'chatwoot-script'
    script.src = `${baseUrl}/packs/js/sdk.js`
    script.async = true
    script.defer = true

    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Chatwoot script'))

    document.body.appendChild(script)
  })
}

/**
 * Initializes Chatwoot widget
 */
export function initializeChatwoot(config: ChatwootConfig) {
  if (!window.$chatwoot) {
    console.error('Chatwoot SDK not loaded')
    return
  }

  window.$chatwoot.run({
    websiteToken: config.websiteToken,
    baseUrl: config.baseUrl,
  })
}

/**
 * React hook for Chatwoot integration
 */
export function useChatwoot(
  config: ChatwootConfig | null,
  options?: {
    hideMessageBubble?: boolean
    position?: 'left' | 'right'
    locale?: string
    darkMode?: 'light' | 'auto'
  },
) {
  const isLoadedRef = useRef(false)

  useEffect(() => {
    if (!config || isLoadedRef.current) return

    // Set Chatwoot settings before loading
    window.chatwootSettings = {
      hideMessageBubble: options?.hideMessageBubble ?? false,
      position: options?.position ?? 'right',
      locale: options?.locale ?? 'en',
      darkMode: options?.darkMode ?? 'auto',
      type: 'standard',
    }

    // Load and initialize Chatwoot
    loadChatwootScript(config.baseUrl)
      .then(() => {
        // Wait a bit for SDK to be available
        const checkSDK = setInterval(() => {
          if (window.$chatwoot) {
            clearInterval(checkSDK)
            initializeChatwoot(config)
            isLoadedRef.current = true
          }
        }, 100)

        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkSDK), 5000)
      })
      .catch((error) => {
        console.error('Failed to load Chatwoot:', error)
      })

    // Cleanup function
    return () => {
      if (window.$chatwoot) {
        window.$chatwoot.reset()
      }
    }
  }, [config, options])

  return {
    toggle: (state?: 'open' | 'close') => window.$chatwoot?.toggle(state),
    setUser: (identifier: string, user: { name?: string; email?: string; avatar_url?: string }) =>
      window.$chatwoot?.setUser(identifier, user),
    setCustomAttributes: (attributes: Record<string, string | number | boolean>) =>
      window.$chatwoot?.setCustomAttributes(attributes),
    deleteUser: () => window.$chatwoot?.deleteUser(),
    setLabel: (label: string) => window.$chatwoot?.setLabel(label),
    removeLabel: (label: string) => window.$chatwoot?.removeLabel(label),
    reset: () => window.$chatwoot?.reset(),
    isLoaded: isLoadedRef.current,
  }
}

/**
 * Get Chatwoot configuration from environment variables
 */
export function getChatwootConfig(): ChatwootConfig | null {
  const websiteToken = import.meta.env.VITE_CHATWOOT_WEBSITE_TOKEN
  const baseUrl = import.meta.env.VITE_CHATWOOT_BASE_URL

  if (!websiteToken || !baseUrl) {
    return null
  }

  return {
    websiteToken,
    baseUrl,
  }
}
