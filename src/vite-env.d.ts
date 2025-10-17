// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ARK_SERVER?: string
  readonly VITE_BOLTZ_URL?: string
  readonly VITE_ARK_ESCROW_URL?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Navigator {
  standalone?: boolean
}
