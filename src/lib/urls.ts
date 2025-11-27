import { Network } from '@arkade-os/boltz-swap'
import { readConfigFromStorage } from './storage'

type Service = 'ark' | 'boltz' | 'esplora' | 'indexer'

// TODO: Default urls to be provided
const DEFAULT_ARK_SERVER_URLS: Partial<Record<Network, string>> = {}

const DEFAULT_BOLTZ_SERVER_URLS: Partial<Record<Network, string>> = {
  bitcoin: 'https://api.ark.boltz.exchange',
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
}

// TODO: Default urls to be provided
const DEFAULT_ESPLORA_SERVER_URLS: Partial<Record<Network, string>> = {}

// TODO: Default urls to be provided
const DEFAULT_INDEXER_SERVER_URLS: Partial<Record<Network, string>> = {}

type EnvUrlImporters = { [S in Service]: { [N in Network]: () => string | undefined } }
type StorageUrlImporters = { [S in Service]: () => string | undefined }

const ENV_URL_IMPORTERS: EnvUrlImporters = {
  ark: {
    bitcoin: importArkBitcoinUrl,
    mutinynet: importArkMutinyUrl,
    regtest: importArkRegTestUrl,
    signet: importArkSigNetUrl,
    testnet: importArkTestnetUrl,
  },
  boltz: {
    bitcoin: importBoltzBitcoinUrl,
    mutinynet: importBoltzMutinyUrl,
    regtest: importBoltzRegTestUrl,
    signet: importBoltzSigNetUrl,
    testnet: importBoltzTestnetUrl,
  },
  esplora: {
    bitcoin: importEsploraBitcoinUrl,
    mutinynet: importEsploraMutinyUrl,
    regtest: importEsploraRegTestUrl,
    signet: importEsploraSigNetUrl,
    testnet: importEsploraTestnetUrl,
  },
  indexer: {
    bitcoin: importIndexerBitcoinUrl,
    mutinynet: importIndexerMutinyUrl,
    regtest: importIndexerRegTestUrl,
    signet: importIndexerSigNetUrl,
    testnet: importIndexerTestnetUrl,
  },
} as const

const STORAGE_URL_IMPORTERS: StorageUrlImporters = {
  ark: importArkUrlFromStorage,
  boltz: importBoltzUrlFromStorage,
  esplora: importEsploraUrlFromStorage,
  indexer: importIndexerUrlFromStorage,
} as const

export function getArkUrl(network: Network): string {
  return resolveUrl(network, 'ark', DEFAULT_ARK_SERVER_URLS)
}

export function getBoltzUrl(network: Network): string {
  return resolveUrl(network, 'boltz', DEFAULT_BOLTZ_SERVER_URLS)
}

export function getEsploraUrl(network: Network): string {
  return resolveUrl(network, 'esplora', DEFAULT_ESPLORA_SERVER_URLS)
}

export function getIndexerUrl(network: Network): string {
  return resolveUrl(network, 'indexer', DEFAULT_INDEXER_SERVER_URLS)
}

function resolveUrl(network: Network, service: Service, defaults: Partial<Record<Network, string>>): string {
  const envImporter = ENV_URL_IMPORTERS[service][network]
  const storageImporter = STORAGE_URL_IMPORTERS[service]
  let url = envImporter() || legacyImporter(service) || storageImporter() || defaults[network]
  if (!url) {
    throw new Error(`No url found for ${service} on ${network} network`)
  }
  return url
}

function legacyImporter(service: Service): string | undefined {
  switch (service) {
    case 'ark':
      return import.meta.env.VITE_ARK_SERVER
    case 'boltz':
      return import.meta.env.VITE_BOLTZ_URL
  }
}

function importArkUrlFromStorage(): string | undefined {
  const config = readConfigFromStorage()
  return config?.aspUrl
}

function importBoltzUrlFromStorage(): string | undefined {
  const config = readConfigFromStorage()
  return config?.boltzUrl
}

function importEsploraUrlFromStorage(): string | undefined {
  const config = readConfigFromStorage()
  return config?.esploraUrl
}

function importIndexerUrlFromStorage(): string | undefined {
  const config = readConfigFromStorage()
  return config?.indexerUrl
}

function importArkBitcoinUrl(): string | undefined {
  return import.meta.env.VITE_ARK_SERVER_URL_BITCOIN
}

function importArkMutinyUrl(): string | undefined {
  return import.meta.env.VITE_ARK_SERVER_URL_MUTINYNET
}

function importArkSigNetUrl(): string | undefined {
  return import.meta.env.VITE_ARK_SERVER_URL_SIGNET
}

function importArkRegTestUrl(): string | undefined {
  return import.meta.env.VITE_ARK_SERVER_URL_REGTEST
}

function importArkTestnetUrl(): string | undefined {
  return import.meta.env.VITE_ARK_SERVER_URL_TESTNET
}

function importBoltzBitcoinUrl(): string | undefined {
  return import.meta.env.VITE_BOLTZ_URL_BITCOIN
}

function importBoltzMutinyUrl(): string | undefined {
  return import.meta.env.VITE_BOLTZ_URL_MUTINYNET
}

function importBoltzSigNetUrl(): string | undefined {
  return import.meta.env.VITE_BOLTZ_URL_SIGNET
}

function importBoltzRegTestUrl(): string | undefined {
  return import.meta.env.VITE_BOLTZ_URL_REGTEST
}

function importBoltzTestnetUrl(): string | undefined {
  return import.meta.env.VITE_BOLTZ_URL_TESTNET
}

function importEsploraBitcoinUrl(): string | undefined {
  return import.meta.env.VITE_ESPLORA_URL_BITCOIN
}

function importEsploraMutinyUrl(): string | undefined {
  return import.meta.env.VITE_ESPLORA_URL_MUTINYNET
}

function importEsploraSigNetUrl(): string | undefined {
  return import.meta.env.VITE_ESPLORA_URL_SIGNET
}

function importEsploraRegTestUrl(): string | undefined {
  return import.meta.env.VITE_ESPLORA_URL_REGTEST
}

function importEsploraTestnetUrl(): string | undefined {
  return import.meta.env.VITE_ESPLORA_URL_TESTNET
}

function importIndexerBitcoinUrl(): string | undefined {
  return import.meta.env.VITE_INDEXER_URL_BITCOIN
}

function importIndexerMutinyUrl(): string | undefined {
  return import.meta.env.VITE_INDEXER_URL_MUTINYNET
}

function importIndexerSigNetUrl(): string | undefined {
  return import.meta.env.VITE_INDEXER_URL_SIGNET
}

function importIndexerRegTestUrl(): string | undefined {
  return import.meta.env.VITE_INDEXER_URL_REGTEST
}

function importIndexerTestnetUrl(): string | undefined {
  return import.meta.env.VITE_INDEXER_URL_TESTNET
}
