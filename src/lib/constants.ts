import { Delegate } from './types'
import { Network } from '@arkade-os/boltz-swap'

export const arknoteHRP = 'arknote'
export const defaultFee = 0
export const testDomains = ['dev.arkade.money', 'next.arkade.money', 'pages.dev', 'localhost']
export const devServer = 'http://localhost:7070'
export const testServer = 'https://mutinynet.arkade.sh'
export const mainServer = 'https://arkade.computer'
export const defaultPassword = 'noah'
export const minSatsToNudge = 100_000
export const maxPercentage = import.meta.env.VITE_MAX_PERCENTAGE ?? 10
export const psaMessage = import.meta.env.VITE_PSA_MESSAGE ?? ''
export const enableChainSwapsReceive = import.meta.env.VITE_CHAIN_SWAPS_RECEIVE_ENABLED === 'true'
// Vite bakes __VITE_FOO__ placeholders into the bundle at build time; the
// Docker entrypoint substitutes them with real values at container startup.
// A deployment that doesn't set a given var leaves the literal placeholder,
// which must be treated as "unset" rather than used as a real value (e.g. a
// truthy "__VITE_ARK_SERVER__" string being used as a server URL).
export const fromRuntimeEnv = (value: string | undefined): string | undefined =>
  value && !value.startsWith('__VITE_') ? value : undefined

export const lnurlServerUrl: string | undefined = fromRuntimeEnv(import.meta.env.VITE_LNURL_SERVER_URL)

export const defaultArkServer = () => {
  const arkServer = fromRuntimeEnv(import.meta.env.VITE_ARK_SERVER)
  if (arkServer) return arkServer
  for (const domain of testDomains) {
    if (window.location.hostname.includes(domain)) {
      return window.location.hostname.includes('localhost') ? devServer : testServer
    }
  }
  return mainServer
}

const DELEGATE_URL: Record<Network, string | null> = {
  bitcoin: 'https://delegate.arkade.money',
  mutinynet: `https://delegator.mutinynet.arkade.sh`,
  signet: null,
  regtest: 'http://localhost:7012',
  testnet: null,
}

// solver registry indexes for asset swaps (see arkade-os/solver-registry)
const SOLVER_REGISTRY_URL: Record<Network, string | null> = {
  bitcoin: null,
  mutinynet: 'https://arkade-os.github.io/solver-registry/mutinynet.json',
  signet: null,
  regtest: null,
  testnet: null,
}

// env override first (any network), then the per-network table
const serviceUrlForNetwork = (envValue: string | undefined, table: Record<Network, string | null>, network: Network) =>
  fromRuntimeEnv(envValue) ?? table[network] ?? undefined

export const getSolverRegistryUrl = (network: Network): string | undefined =>
  serviceUrlForNetwork(import.meta.env.VITE_SOLVER_REGISTRY_URL, SOLVER_REGISTRY_URL, network)

// the arkade signer co-signing banco swap covenants (separate service from arkd)
const EMULATOR_URL: Record<Network, string | null> = {
  bitcoin: null,
  // ponytail: unverified guess following the delegator subdomain convention;
  // the provider probes it at startup and disables swaps if unreachable
  mutinynet: 'https://emulator.mutinynet.arkade.sh',
  signet: null,
  regtest: 'http://localhost:7073',
  testnet: null,
}

export const getEmulatorUrlForNetwork = (network: Network): string | undefined =>
  serviceUrlForNetwork(import.meta.env.VITE_EMULATOR_URL, EMULATOR_URL, network)

export const getDelegateUrlForNetwork = (network: Network): string | undefined => {
  return DELEGATE_URL[network] ?? undefined
}

export const getDelegateForNetwork = (network: Network): Delegate | undefined => {
  const url = getDelegateUrlForNetwork(network)
  if (!url) return undefined
  return {
    url,
    fee: 0,
    pubkey: '', // Placeholder, as the actual pubkey should be fetched from the delegate server
    address: '', // Placeholder, as the actual address should be fetched from the delegate server
    name: 'Arkade Default',
  }
}
