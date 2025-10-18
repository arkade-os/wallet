import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  section_separator_color?: string;
  bottom_bar_bg_color?: string;
}

interface TelegramContextType {
  webApp: any;
  user: TelegramUser | null;
  startParam: string | null;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams | null;
  isExpanded: boolean;
  isTelegramEnvironment: boolean;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
  showBackButton: (onClick: () => void) => void;
  hideBackButton: () => void;
  hapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  showAlert: (message: string) => Promise<void>;
  showConfirm: (message: string) => Promise<boolean>;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  ready: () => void;
  close: () => void;
  expand: () => void;
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  user: null,
  startParam: null,
  colorScheme: 'light',
  themeParams: null,
  isExpanded: false,
  isTelegramEnvironment: false,
  showMainButton: () => {},
  hideMainButton: () => {},
  showBackButton: () => {},
  hideBackButton: () => {},
  hapticFeedback: () => {},
  showAlert: async () => {},
  showConfirm: async () => false,
  setHeaderColor: () => {},
  setBackgroundColor: () => {},
  ready: () => {},
  close: () => {},
  expand: () => {},
})

interface TelegramProviderProps {
  children: ReactNode
}

export const TelegramProvider: React.FC<TelegramProviderProps> = ({ children }) => {
  const [webApp, setWebApp] = useState<any>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')
  const [themeParams, setThemeParams] = useState<TelegramThemeParams | null>(null)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [isTelegramEnvironment, setIsTelegramEnvironment] = useState<boolean>(false)

  useEffect(() => {
    // Check if we're running in Telegram
    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp
        setWebApp(tg)
        setUser(tg.initDataUnsafe.user || null)
        setStartParam(tg.initDataUnsafe.start_param || null)
        setColorScheme(tg.colorScheme)
        setThemeParams(tg.themeParams)
        setIsExpanded(tg.isExpanded)
        setIsTelegramEnvironment(true)

        // Set up event listeners
        tg.onEvent('themeChanged', () => {
          setColorScheme(tg.colorScheme)
          setThemeParams(tg.themeParams)
        })

        tg.onEvent('viewportChanged', () => {
          setIsExpanded(tg.isExpanded)
        })

        // Auto-expand the app
        if (!tg.isExpanded) {
          tg.expand()
        }

        // Set default theme colors
        if (tg.themeParams.bg_color) {
          tg.setBackgroundColor(tg.themeParams.bg_color)
        }
        if (tg.themeParams.header_bg_color) {
          tg.setHeaderColor(tg.themeParams.header_bg_color)
        }

        // Ready the app
        tg.ready()
      } else {
        // If not in Telegram, use default values
        setIsTelegramEnvironment(false)
        setColorScheme('light')
      }
    }

    // Check immediately if Telegram is available
    if (window.Telegram?.WebApp) {
      checkTelegram()
    } else {
      // Wait for the Telegram script to load
      const timeout = setTimeout(checkTelegram, 100)
      return () => clearTimeout(timeout)
    }
  }, [])

  // Apply Telegram theme to CSS custom properties
  useEffect(() => {
    if (themeParams && isTelegramEnvironment) {
      const root = document.documentElement

      // Map Telegram theme colors to CSS custom properties
      if (themeParams.bg_color) {
        root.style.setProperty('--telegram-bg-color', themeParams.bg_color)
        root.style.setProperty('--ion-background-color', themeParams.bg_color)
      }
      if (themeParams.text_color) {
        root.style.setProperty('--telegram-text-color', themeParams.text_color)
        root.style.setProperty('--ion-text-color', themeParams.text_color)
      }
      if (themeParams.button_color) {
        root.style.setProperty('--telegram-button-color', themeParams.button_color)
        root.style.setProperty('--ion-color-primary', themeParams.button_color)
      }
      if (themeParams.button_text_color) {
        root.style.setProperty('--telegram-button-text-color', themeParams.button_text_color)
        root.style.setProperty('--ion-color-primary-contrast', themeParams.button_text_color)
      }
      if (themeParams.secondary_bg_color) {
        root.style.setProperty('--telegram-secondary-bg-color', themeParams.secondary_bg_color)
        root.style.setProperty('--ion-color-step-50', themeParams.secondary_bg_color)
      }
      if (themeParams.hint_color) {
        root.style.setProperty('--telegram-hint-color', themeParams.hint_color)
        root.style.setProperty('--ion-color-medium', themeParams.hint_color)
      }
      if (themeParams.link_color) {
        root.style.setProperty('--telegram-link-color', themeParams.link_color)
        root.style.setProperty('--ion-color-primary', themeParams.link_color)
      }
    }
  }, [themeParams, isTelegramEnvironment])

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.setText(text)
      webApp.MainButton.onClick(onClick)
      webApp.MainButton.show()
    }
  }

  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide()
    }
  }

  const showBackButton = (onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick)
      webApp.BackButton.show()
    }
  }

  const hideBackButton = () => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide()
    }
  }

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (webApp?.HapticFeedback) {
      if (type === 'success' || type === 'warning' || type === 'error') {
        webApp.HapticFeedback.notificationOccurred(type)
      } else {
        webApp.HapticFeedback.impactOccurred(type)
      }
    }
  }

  const showAlert = (message: string): Promise<void> => {
    return new Promise((resolve) => {
      if (webApp?.showAlert) {
        webApp.showAlert(message, resolve)
      } else {
        alert(message)
        resolve()
      }
    })
  }

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (webApp?.showConfirm) {
        webApp.showConfirm(message, resolve)
      } else {
        resolve(confirm(message))
      }
    })
  }

  const setHeaderColor = (color: string) => {
    if (webApp?.setHeaderColor) {
      webApp.setHeaderColor(color)
    }
  }

  const setBackgroundColor = (color: string) => {
    if (webApp?.setBackgroundColor) {
      webApp.setBackgroundColor(color)
    }
  }

  const ready = () => {
    if (webApp?.ready) {
      webApp.ready()
    }
  }

  const close = () => {
    if (webApp?.close) {
      webApp.close()
    }
  }

  const expand = () => {
    if (webApp?.expand) {
      webApp.expand()
    }
  }

  const value: TelegramContextType = {
    webApp,
    user,
    startParam,
    colorScheme,
    themeParams,
    isExpanded,
    isTelegramEnvironment,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    showAlert,
    showConfirm,
    setHeaderColor,
    setBackgroundColor,
    ready,
    close,
    expand,
  }

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
}

export const useTelegram = () => {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider')
  }
  return context
}

export { TelegramContext }