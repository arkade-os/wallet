interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    query_id?: string
    user?: TelegramUser
    receiver?: TelegramUser
    chat?: TelegramChat
    chat_type?: string
    chat_instance?: string
    start_param?: string
    can_send_after?: number
    auth_date: number
    hash: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  isClosingConfirmationEnabled: boolean
  headerColor: string
  backgroundColor: string
  bottomBarColor: string
  BackButton: TelegramBackButton
  MainButton: TelegramMainButton
  SecondaryButton: TelegramSecondaryButton
  SettingsButton: TelegramSettingsButton
  HapticFeedback: TelegramHapticFeedback
  CloudStorage: TelegramCloudStorage
  BiometricManager: TelegramBiometricManager

  // Methods
  ready(): void
  expand(): void
  close(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  setBottomBarColor(color: string): void
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  showPopup(params: TelegramPopupParams, callback?: (buttonId: string) => void): void
  showAlert(message: string, callback?: () => void): void
  showConfirm(message: string, callback?: (confirmed: boolean) => void): void
  showScanQrPopup(params: TelegramScanQrPopupParams, callback?: (text: string) => void): void
  closeScanQrPopup(): void
  readTextFromClipboard(callback?: (text: string) => void): void
  requestWriteAccess(callback?: (granted: boolean) => void): void
  requestContact(callback?: (granted: boolean) => void): void
  switchInlineQuery(query: string, choose_chat_types?: string[]): void
  openLink(url: string, options?: { try_instant_view?: boolean }): void
  openTelegramLink(url: string): void
  shareToStory(media_url: string, params?: TelegramStoryShareParams): void

  // Events
  onEvent(eventType: string, eventHandler: () => void): void
  offEvent(eventType: string, eventHandler: () => void): void
  sendData(data: string): void
}

interface TelegramUser {
  id: number
  is_bot?: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface TelegramChat {
  id: number
  type: 'group' | 'supergroup' | 'channel'
  title: string
  username?: string
  photo_url?: string
}

interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  accent_text_color?: string
  section_bg_color?: string
  section_header_text_color?: string
  subtitle_text_color?: string
  destructive_text_color?: string
  section_separator_color?: string
  bottom_bar_bg_color?: string
}

interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(callback: () => void): void
  offClick(callback: () => void): void
}

interface TelegramMainButton {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  setText(text: string): void
  onClick(callback: () => void): void
  offClick(callback: () => void): void
  show(): void
  hide(): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  setParams(params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }): void
}

interface TelegramSecondaryButton {
  text: string
  color: string
  textColor: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  position: 'left' | 'right' | 'top' | 'bottom'
  setText(text: string): void
  onClick(callback: () => void): void
  offClick(callback: () => void): void
  show(): void
  hide(): void
  enable(): void
  disable(): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
  setParams(params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
    position?: 'left' | 'right' | 'top' | 'bottom'
  }): void
}

interface TelegramSettingsButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(callback: () => void): void
  offClick(callback: () => void): void
}

interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (error: string | null, stored?: boolean) => void): void
  getItem(key: string, callback?: (error: string | null, value?: string) => void): void
  getItems(keys: string[], callback?: (error: string | null, values?: Record<string, string>) => void): void
  removeItem(key: string, callback?: (error: string | null, removed?: boolean) => void): void
  removeItems(keys: string[], callback?: (error: string | null, removed?: boolean) => void): void
  getKeys(callback?: (error: string | null, keys?: string[]) => void): void
}

interface TelegramBiometricManager {
  isInited: boolean
  isBiometricAvailable: boolean
  biometricType: 'finger' | 'face' | 'unknown'
  isAccessRequested: boolean
  isAccessGranted: boolean
  isBiometricTokenSaved: boolean
  deviceId: string
  init(callback?: () => void): void
  requestAccess(params: { reason?: string }, callback?: (granted: boolean) => void): void
  authenticate(params: { reason?: string }, callback?: (authenticated: boolean, token?: string) => void): void
  updateBiometricToken(token: string, callback?: (updated: boolean) => void): void
  openSettings(): void
}

interface TelegramPopupParams {
  title?: string
  message: string
  buttons?: Array<{
    id?: string
    type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
    text?: string
  }>
}

interface TelegramScanQrPopupParams {
  text?: string
}

interface TelegramStoryShareParams {
  text?: string
  widget_link?: {
    url: string
    name?: string
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export {}