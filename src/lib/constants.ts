import { hex } from '@scure/base'
import { Delegate } from './types'
import { NetworkName } from '@arkade-os/sdk'

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

const DELEGATE_URL: Record<NetworkName, string | null> = {
  bitcoin: 'https://delegate.arkade.money',
  mutinynet: `https://delegator.mutinynet.arkade.sh`,
  signet: null,
  regtest: 'http://localhost:7012',
  testnet: null,
}

// solver registry indexes for asset swaps (see arkade-os/solver-registry)
const SOLVER_REGISTRY_URL: Record<NetworkName, string | null> = {
  bitcoin: 'https://arkade-os.github.io/solver-registry/bitcoin.json',
  mutinynet: 'https://arkade-os.github.io/solver-registry/mutinynet.json',
  signet: null,
  regtest: 'http://localhost:3002/solver-registry/regtest.json',
  testnet: 'https://arkade-os.github.io/solver-registry/testnet.json',
}

// env override first (any network), then the per-network table
const serviceUrlForNetwork = (
  envValue: string | undefined,
  table: Record<NetworkName, string | null>,
  network: NetworkName,
) => fromRuntimeEnv(envValue) ?? table[network] ?? undefined

export const getSolverRegistryUrl = (network: NetworkName): string | undefined =>
  serviceUrlForNetwork(import.meta.env.VITE_SOLVER_REGISTRY_URL, SOLVER_REGISTRY_URL, network)

// the Arkade RFQ swap service serving arkade:BTC -> lightning:BTC
// (see arkade-os/lightning-swap-service). Every entry is null on purpose: no
// endpoint has been confirmed for any network, so the RFQ send path stays off
// until one is supplied here or through VITE_LN_SWAP_URL. Guessing a host
// would send real invoices somewhere nobody has verified.
const LN_SWAP_URL: Record<NetworkName, string | null> = {
  bitcoin: null,
  mutinynet: null,
  signet: null,
  regtest: null,
  testnet: null,
}

export const getLnSwapUrlForNetwork = (network: NetworkName): string | undefined =>
  serviceUrlForNetwork(import.meta.env.VITE_LN_SWAP_URL, LN_SWAP_URL, network)

// The x-only key of the arkade signer co-signing swap covenants (a separate
// service from arkd). This is a fact about the SOLVER's deployment, not a
// value the client may look up: clients have no network path to the emulator,
// only the solver and covclaimd do, so `@arkade-os/swap` deliberately neither
// fetches nor verifies it (arkade-os/ts-sdk#691) and takes it from the caller.
//
// TODO: source this from the discovered market instead. The authoritative
// value is the solver's signed registry card (`emulator_pubkey`,
// arkade-os/solver-registry#18) — which `discoverMarkets` already fetches —
// but no published @arkade-os/solver-discovery carries that field yet (0.2.2,
// the latest, predates the merge), so it is pinned per network until one does.
const EMULATOR_PUBKEY: Record<NetworkName, string | null> = {
  // null on purpose: no key has been checked against a signed solver card for
  // these networks, and guessing one derives a covenant the solver can never
  // fill. Swaps stay off rather than funding an address nobody can settle.
  bitcoin: null,
  // read from https://emulator.mutinynet.arkade.sh/v1/info on 2026-08-07 —
  // the same value the client used to fetch live at swap time, stored in the
  // endpoint's own compressed form so it can be re-checked with a plain curl.
  // Pinning does not make it more trusted; it makes it reviewable, and stops
  // the host swapping it under a running client.
  mutinynet: '03f823b9b2febc81f4af967e77aed2f541cbd3397c6d8f5a72e32eb7b471af889a',
  signet: null,
  // per-deployment: a local stack generates its own co-signer key, so there is
  // no constant to pin. Set VITE_EMULATOR_PUBKEY to your emulator's
  // `/v1/info` signerPubkey.
  regtest: null,
  testnet: null,
}

/** The covenant co-signer's x-only key (32 bytes), or undefined when this
 * network has none configured. Compressed (33-byte) values are accepted and
 * narrowed, matching the SDK's own normalization. A malformed value reads as
 * absent: failing closed disables swaps, where passing garbage through would
 * derive a covenant the solver cannot fill. */
export const getEmulatorPubkeyForNetwork = (network: NetworkName): Uint8Array | undefined => {
  const configured = serviceUrlForNetwork(import.meta.env.VITE_EMULATOR_PUBKEY, EMULATOR_PUBKEY, network)
  if (!configured) return undefined
  try {
    const key = hex.decode(configured)
    if (key.length === 33) return key.slice(1)
    return key.length === 32 ? key : undefined
  } catch {
    return undefined
  }
}

export const getDelegateUrlForNetwork = (network: NetworkName): string | undefined => {
  return DELEGATE_URL[network] ?? undefined
}

export const getDelegateForNetwork = (network: NetworkName): Delegate | undefined => {
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
