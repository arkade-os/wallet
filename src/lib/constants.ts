import { Delegate } from './types'
import { Network } from '@arkade-os/boltz-swap'
import { isNativeRuntime } from '../runtime/runtime'

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
  // Under Capacitor the WebView hostname is `localhost`, which would otherwise
  // match `testDomains` and pin the native app to a local dev server. Native
  // defaults to mainnet (matching the PWA); beta builds set VITE_ARK_SERVER.
  if (isNativeRuntime()) return mainServer
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
