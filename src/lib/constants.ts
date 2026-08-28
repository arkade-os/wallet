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
// mutinynet's arkd advertises a 4096s checkpoint exit delay; the SDK's default policy can't tell
// mutinynet apart from testnet/signet (same bech32) and applies the 86400s mainnet-grade floor,
// so connecting there needs this override (@arkade-os/sdk#706).
export const mutinynetMinCheckpointExitDelaySeconds = BigInt(4096)
// Vite bakes __VITE_FOO__ placeholders into the bundle at build time; the
// Docker entrypoint substitutes them with real values at container startup.
// A deployment that doesn't set a given var leaves the literal placeholder,
// which must be treated as "unset" rather than used as a real value (e.g. a
// truthy "__VITE_ARK_SERVER__" string being used as a server URL).
export const fromRuntimeEnv = (value: string | undefined): string | undefined =>
  value && !value.startsWith('__VITE_') ? value : undefined

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

export const isMainnet = (network: NetworkName | string): boolean =>
  !!network && network !== 'testnet' && network !== 'mutinynet' && network !== 'signet' && network !== 'regtest'

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

// The x-only key of the arkade signer co-signing swap covenants (a separate
// service from arkd). This is a fact about the SOLVER's deployment, not a
// value the client may look up: clients have no network path to the emulator,
// only the solver and covclaimd do, so `@arkade-os/swap` deliberately neither
// fetches nor verifies it (arkade-os/ts-sdk#691) and takes it from the caller.
//
// This table is now the FALLBACK, not the only source. A corridor market whose
// card carries `emulator_pubkey` (arkade-os/solver-registry#18) is authoritative
// and `lnSendRendezvous` prefers it; the pins below keep a network working until
// its solver publishes one, and are what a wallet compares the card against.
const EMULATOR_PUBKEY: Record<NetworkName, string | null> = {
  // Matches the SDK's own per-network pin (BITCOIN_EMULATOR_PUBKEY, ts-sdk
  // networks.ts), re-checked against the deployment's own signer key; a
  // mainnet Lightning send against this key settled end to end on
  // 2026-08-12.
  bitcoin: '0239c196415da47b26456a101daaa12ba9e445bfe153197f1e2b750bf40e52092e',
  // read from the mutinynet deployment's own signer key on 2026-08-07 — the
  // same value the client used to fetch live at swap time, stored in its
  // compressed form. Pinning does not make it more trusted; it makes it
  // reviewable, and stops the host swapping it under a running client.
  mutinynet: '03f823b9b2febc81f4af967e77aed2f541cbd3397c6d8f5a72e32eb7b471af889a',
  signet: null,
  // per-deployment: a local stack generates its own co-signer key, so there is
  // no constant to pin. Set VITE_EMULATOR_PUBKEY to your emulator's signer
  // key.
  regtest: '02999413c46fa10ada5cbc4bcc79a1d09160c2ba3cfc812705d7a13e5e545fb2a9',
  testnet: null,
}

/** The configured co-signer key as configured — compressed hex for every pin
 * above, which is the shape `@arkade-os/swap` takes as its override. Since
 * 0.0.3 the package resolves the key from its own per-network pin, so this is
 * only passed where the wallet has a value of its own: a deployment with no
 * package pin (regtest) has nowhere else to get one. */
export const getEmulatorPubkeyHexForNetwork = (network: NetworkName): string | undefined =>
  serviceUrlForNetwork(import.meta.env.VITE_EMULATOR_PUBKEY, EMULATOR_PUBKEY, network)

/** The covenant co-signer's x-only key (32 bytes), or undefined when this
 * network has none configured. Compressed (33-byte) values are accepted and
 * narrowed, matching the SDK's own normalization. A malformed value reads as
 * absent: failing closed disables swaps, where passing garbage through would
 * derive a covenant the solver cannot fill. */
export const getEmulatorPubkeyForNetwork = (network: NetworkName): Uint8Array | undefined => {
  const configured = getEmulatorPubkeyHexForNetwork(network)
  if (!configured) return undefined
  try {
    const key = hex.decode(configured)
    if (key.length === 33) return key.slice(1)
    return key.length === 32 ? key : undefined
  } catch {
    return undefined
  }
}

/** 66 lowercase hex chars with an 02/03 prefix — a compressed secp256k1 point,
 * the only shape `@arkade-os/swap`'s `resolveEmulatorPubkey` accepts. */
const COMPRESSED_PUBKEY_HEX = /^0[23][0-9a-f]{64}$/

/**
 * The compressed (33-byte) hex `@arkade-os/swap` takes as its `emulatorPubkey`
 * override, or undefined when the configured key is absent, x-only, or
 * malformed — in which case the package falls back to its own per-network pin.
 *
 * Same env/table source as {@link getEmulatorPubkeyForNetwork}, different shape
 * gate: that one feeds the covenant derivation, which wants the x-only form and
 * narrows a compressed value to reach it. This one cannot narrow in the other
 * direction — re-adding the 02/03 prefix to an x-only key is a coin flip between
 * two distinct points — so an x-only value reads as NO override rather than as a
 * guess.
 *
 * The trap that leaves: a deployment whose `VITE_EMULATOR_PUBKEY` is x-only
 * keeps the QR corridor's rendezvous working (it compares against the card's own
 * x-only key) while the RFQ override goes absent, so the covenant derives from
 * the package's placeholder and `verifyLockupAddress` refuses at quote time. A
 * deployment that wants regtest RFQ must configure the compressed form.
 */
export const getEmulatorPubkeyOverrideForNetwork = (network: NetworkName): string | undefined => {
  const configured = getEmulatorPubkeyHexForNetwork(network)
  return configured && COMPRESSED_PUBKEY_HEX.test(configured) ? configured : undefined
}

// covclaimd — the service that could claim a Lightning-receive lockup for an
// OFFLINE wallet — is deliberately not configured here. The receive screen
// stays open and claims with its own covenant `receiver` key, so no deployment
// needs to exist for the corridor to work; see `sealingKey` in lib/lnReceive.
// Re-adding a URL table here is only worth it alongside a background claimer.

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
