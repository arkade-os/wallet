import { Network } from '@arkade-os/boltz-swap'

// Default urls to be provided
const DEFAULT_ARK_SERVER_URLS: Partial<Record<Network, string>> = {}

const DEFAULT_BOLTZ_SERVER_URLS: Partial<Record<Network, string>> = {
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
}

// Default urls to be provided
const DEFAULT_ESPLORA_SERVER_URLS: Partial<Record<Network, string>> = {}

// Default urls to be provided
const DEFAULT_INDEXER_SERVER_URLS: Partial<Record<Network, string>> = {}

export function getArkUrl(network: Network): string {
  let arkUrl = DEFAULT_ARK_SERVER_URLS[network]
  if (network === 'bitcoin') {
    arkUrl = importArkBitcoinUrl()
  }
  if (network === 'mutinynet') {
    arkUrl = importArkMutinyUrl()
  }
  if (network === 'regtest') {
    arkUrl = importArkRegTestUrl()
  }
  if (network === 'signet') {
    arkUrl = importArkSigNetUrl()
  }
  if (!arkUrl) {
    throw new Error(`No url found for ark on ${network} network`)
  }
  return arkUrl
}

export function getBoltzUrl(network: Network): string {
  let boltztUrl = DEFAULT_BOLTZ_SERVER_URLS[network]
  if (network === 'bitcoin') {
    boltztUrl = importBoltzBitcoinUrl()
  }
  if (network === 'mutinynet') {
    boltztUrl = importBoltzMutinyUrl()
  }
  if (network === 'regtest') {
    boltztUrl = importBoltzRegTestUrl()
  }
  if (network === 'signet') {
    boltztUrl = importBoltzSigNetUrl()
  }
  if (!boltztUrl) {
    throw new Error(`No url found for boltz on ${network} network`)
  }
  return boltztUrl
}

export function getEsploraUrl(network: Network): string {
  let esploraUrl = DEFAULT_ESPLORA_SERVER_URLS[network]
  if (network === 'bitcoin') {
    esploraUrl = importEsploraBitcoinUrl()
  }
  if (network === 'mutinynet') {
    esploraUrl = importEsploraMutinyUrl()
  }
  if (network === 'regtest') {
    esploraUrl = importEsploraRegTestUrl()
  }
  if (network === 'signet') {
    esploraUrl = importEsploraSigNetUrl()
  }
  if (!esploraUrl) {
    throw new Error(`No url found for esplora on ${network} network`)
  }
  return esploraUrl
}

export function getIndexerUrl(network: Network): string {
  let indexerUrl = DEFAULT_INDEXER_SERVER_URLS[network]
  if (network === 'bitcoin') {
    indexerUrl = importIndexerBitcoinUrl()
  }
  if (network === 'mutinynet') {
    indexerUrl = importIndexerMutinyUrl()
  }
  if (network === 'regtest') {
    indexerUrl = importIndexerRegTestUrl()
  }
  if (network === 'signet') {
    indexerUrl = importIndexerSigNetUrl()
  }
  if (!indexerUrl) {
    throw new Error(`No url found for indexer on ${network} network`)
  }
  return indexerUrl
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
