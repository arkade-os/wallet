import { Network } from '@arkade-os/boltz-swap'
import { readConfigFromStorage } from './storage'

type Service = 'ark' | 'boltz' | 'esplora' | 'indexer'

// TODO: Default urls to be provided
const DEFAULT_ARK_SERVER_URLS: Partial<Record<Network, string>> = {}

const DEFAULT_BOLTZ_SERVER_URLS: Partial<Record<Network, string>> = {
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
}

// TODO: Default urls to be provided
const DEFAULT_ESPLORA_SERVER_URLS: Partial<Record<Network, string>> = {}

// TODO: Default urls to be provided
const DEFAULT_INDEXER_SERVER_URLS: Partial<Record<Network, string>> = {}

const ENV_URLS_IMPORTERS = {
  ark: {
    bitcoin: importArkBitcoinUrl,
    mutinynet: importArkMutinyUrl,
    regtest: importArkRegTestUrl,
    signet: importArkSigNetUrl,
  },
  boltz: {
    bitcoin: importBoltzBitcoinUrl,
    mutinynet: importBoltzMutinyUrl,
    regtest: importBoltzRegTestUrl,
    signet: importBoltzSigNetUrl,
  },
  esplora: {
    bitcoin: importEsploraBitcoinUrl,
    mutinynet: importEsploraMutinyUrl,
    regtest: importEsploraRegTestUrl,
    signet: importEsploraSigNetUrl,
  },
  indexer: {
    bitcoin: importIndexerBitcoinUrl,
    mutinynet: importIndexerMutinyUrl,
    regtest: importIndexerRegTestUrl,
    signet: importIndexerSigNetUrl,
  },
}

const STORAGE_URLS_IMPORTERS = {
  ark: importArkUrlFromStorage,
  boltz: importBoltzUrlFromStorage,
  esplora: importEsploraUrlFromStorage,
  indexer: importIndexerUrlFromStorage,
}

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
  const envImporter = ENV_URLS_IMPORTERS[service][network]
  const storageImporter = STORAGE_URLS_IMPORTERS[service]
  let url = storageImporter() || envImporter() || defaults[network]
  if (!url) {
    throw new Error(`No url found for ${service} on ${network} network`)
  }
  return url
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
