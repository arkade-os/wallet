// eslint-disable-next-line spaced-comment
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ARK_SERVER_URL_BITCOIN?: string
  readonly VITE_ARK_SERVER_URL_MUTINYNET?: string
  readonly VITE_ARK_SERVER_URL_REGTEST?: string
  readonly VITE_ARK_SERVER_URL_SIGNET?: string
  readonly VITE_BOLTZ_URL_BITCOIN?: string
  readonly VITE_BOLTZ_URL_MUTINYNET?: string
  readonly VITE_BOLTZ_URL_REGTEST?: string
  readonly VITE_BOLTZ_URL_SIGNET?: string
  readonly VITE_ESPLORA_URL_BITCOIN?: string
  readonly VITE_ESPLORA_URL_MUTINYNET?: string
  readonly VITE_ESPLORA_URL_REGTEST?: string
  readonly VITE_ESPLORA_URL_SIGNET?: string
  readonly VITE_INDEXER_URL_BITCOIN?: string
  readonly VITE_INDEXER_URL_MUTINYNET?: string
  readonly VITE_INDEXER_URL_REGTEST?: string
  readonly VITE_INDEXER_URL_SIGNET?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Navigator {
  standalone?: boolean
}
