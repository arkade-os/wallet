// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ARK_SERVER?: string
  readonly VITE_DEV_MNEMONIC?: string
  readonly VITE_DEV_NSEC?: string
  readonly VITE_DEV_RESET_WALLET_ON_BOOT?: string
  readonly VITE_DEV_AUTO_INIT?: string
  readonly VITE_BOLTZ_URL?: string
  readonly VITE_DELEGATOR_URL?: string
  readonly VITE_LNURL_SERVER_URL?: string
  readonly VITE_DISCOVERY_REGISTRIES?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Navigator {
  standalone?: boolean
}
