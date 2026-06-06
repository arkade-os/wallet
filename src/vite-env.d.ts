// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ARK_SERVER?: string
  readonly VITE_DEV_NSEC?: string
  readonly VITE_BOLTZ_URL?: string
  readonly VITE_DELEGATOR_URL?: string
  // Selects the top-level app shell at build time. Unset (PWA) defaults to
  // 'web-pwa'; the Capacitor build defines it as 'native-capacitor'.
  readonly VITE_RUNTIME?: 'web-pwa' | 'native-capacitor'
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Navigator {
  standalone?: boolean
}
