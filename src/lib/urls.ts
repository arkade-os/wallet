import { Network } from '@arkade-os/boltz-swap'

const DEFAULT_ARK_SERVER_URLS: Partial<Record<Network, string>> = {}

const DEFAULT_BOLTZ_SERVER_URLS: Partial<Record<Network, string>> = {
  mutinynet: 'https://api.boltz.mutinynet.arkade.sh',
  signet: 'https://boltz.signet.arkade.sh',
  regtest: 'http://localhost:9069',
}

const DEFAULT_ESPLORA_SERVER_URLS: Partial<Record<Network, string>> = {}

const DEFAULT_INDEXER_SERVER_URLS: Partial<Record<Network, string>> = {}

export function getArkUrl(network: Network): string {
  const defaultUrl = DEFAULT_ARK_SERVER_URLS[network]
  if (network === 'bitcoin') {
    return importArkBitcoinUrl() ?? defaultUrl
  }
  if (network === 'mutinynet') {
    return importArkMutinyUrl() ?? defaultUrl
  }
  if (network === 'regtest') {
    return importArkRegTestUrl() ?? defaultUrl
  }
  return importArkSigNetUrl() ?? defaultUrl
}

export function getBoltzUrl(network: Network): string {
  const defaultUrl = DEFAULT_BOLTZ_SERVER_URLS[network]

  if (network === 'bitcoin') {
    return importBoltzBitcoinUrl() ?? defaultUrl
  }
  if (network === 'mutinynet') {
    return importBoltzMutinyUrl() ?? defaultUrl
  }
  if (network === 'regtest') {
    return importBoltzRegTestUrl() ?? defaultUrl
  }
  return importBoltzSigNetUrl() ?? defaultUrl
}

export function getEsploraUrl(network: Network): string {
  const defaultUrl = DEFAULT_ESPLORA_SERVER_URLS[network]
  if (network === 'bitcoin') {
    return importEsploraBitcoinUrl() ?? defaultUrl
  }
  if (network === 'mutinynet') {
    return importEsploraMutinyUrl() ?? defaultUrl
  }
  if (network === 'regtest') {
    return importEsploraRegTestUrl() ?? defaultUrl
  }
  return importEsploraSigNetUrl() ?? defaultUrl
}

export function getIndexerUrl(network: Network): string {
  const defaultUrl = DEFAULT_INDEXER_SERVER_URLS[network]
  if (network === 'bitcoin') {
    return importIndexerBitcoinUrl() ?? defaultUrl
  }
  if (network === 'mutinynet') {
    return importIndexerMutinyUrl() ?? defaultUrl
  }
  if (network === 'regtest') {
    return importIndexerRegTestUrl() ?? defaultUrl
  }
  return importIndexerSigNetUrl() ?? defaultUrl
}

function importArkBitcoinUrl(): string {
  return import.meta.env.VITE_ARK_SERVER_URL_BITCOIN ?? ''
}

function importArkMutinyUrl(): string {
  return import.meta.env.VITE_ARK_SERVER_URL_MUTINYNET ?? ''
}

function importArkSigNetUrl(): string {
  return import.meta.env.VITE_ARK_SERVER_URL_SIGNET ?? ''
}

function importArkRegTestUrl(): string {
  return import.meta.env.VITE_ARK_SERVER_URL_REGTEST ?? ''
}

function importBoltzBitcoinUrl(): string {
  return import.meta.env.VITE_BOLTZ_URL_BITCOIN ?? ''
}

function importBoltzMutinyUrl(): string {
  return import.meta.env.VITE_BOLTZ_URL_MUTINYNET ?? ''
}

function importBoltzSigNetUrl(): string {
  return import.meta.env.VITE_BOLTZ_URL_SIGNET ?? ''
}

function importBoltzRegTestUrl(): string {
  return import.meta.env.VITE_BOLTZ_URL_REGTEST ?? ''
}

function importEsploraBitcoinUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_BITCOIN ?? ''
}

function importEsploraMutinyUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_MUTINYNET ?? ''
}

function importEsploraSigNetUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_SIGNET ?? ''
}

function importEsploraRegTestUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_REGTEST ?? ''
}

function importIndexerBitcoinUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_BITCOIN ?? ''
}

function importIndexerMutinyUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_MUTINYNET ?? ''
}

function importIndexerSigNetUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_SIGNET ?? ''
}

function importIndexerRegTestUrl(): string {
  return import.meta.env.VITE_ESPLORA_URL_REGTEST ?? ''
}
