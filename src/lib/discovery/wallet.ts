// Adapter between this wallet's asset/network model and the discovery
// protocol's identifiers. A market's identity is (`base_asset.id`,
// `quote_asset.id`) with ids `btc` or lowercase hex — the wallet's own asset
// ids pass through unchanged (modulo case), so a listed market MUST carry the
// same on-chain id the wallet holds the balance under.

import { isValidAssetId } from '../assets'
import { fromRuntimeEnv } from '../constants'
import { DiscoveryError, quoteOffer, QuoteOfferParams, QuoteOfferResult, SwapDirection } from './index'

/** wallet/arkd network name → registry index file name (per-network partitioning). */
const DISCOVERY_NETWORKS: Record<string, string> = {
  bitcoin: 'mainnet',
  mainnet: 'mainnet',
  mutinynet: 'mutinynet',
  signet: 'signet',
  regtest: 'regtest',
}

export function discoveryNetwork(walletNetwork: string): string | undefined {
  return DISCOVERY_NETWORKS[walletNetwork]
}

/** Discovery asset id for a wallet asset id, or undefined when not tradable via discovery. */
export function assetPairId(walletAssetId: string): string | undefined {
  if (walletAssetId === 'btc') return 'btc' // same canonical id on both sides
  if (isValidAssetId(walletAssetId)) return walletAssetId.toLowerCase()
  return undefined // account rows ('account:usd') and placeholders have no on-chain id
}

// The well-known default registry, published via GitHub Pages; the index
// client appends /<network>.json.
const DEFAULT_REGISTRIES = ['https://arklabshq.github.io/solver-registry']

/** Registries the wallet follows; override with VITE_DISCOVERY_REGISTRIES (comma-separated base URLs). */
export function discoveryRegistryUrls(): string[] {
  const fromEnv = fromRuntimeEnv(import.meta.env.VITE_DISCOVERY_REGISTRIES)
  if (!fromEnv) return DEFAULT_REGISTRIES
  return fromEnv
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
}

export interface SwapQuoteParams extends Omit<QuoteOfferParams, 'pair' | 'direction' | 'depositAmount'> {
  fromAssetId: string
  toAssetId: string
  /** Deposit amount in the from-asset's smallest units. */
  depositAmount: bigint
}

export interface SwapQuoteResult extends QuoteOfferResult {
  pair: string
  direction: SwapDirection
}

/**
 * Quote a wallet swap from one asset to another. A market listing the pair as
 * `from/to` serves it base-to-quote; one listing `to/from` serves it
 * quote-to-base — both orientations are tried, best (first viable) wins.
 */
export async function quoteSwap(params: SwapQuoteParams): Promise<SwapQuoteResult> {
  const { fromAssetId, toAssetId, ...rest } = params
  const from = assetPairId(fromAssetId)
  const to = assetPairId(toAssetId)
  if (!from || !to || from === to) throw new DiscoveryError('no-market', `no market for ${fromAssetId}/${toAssetId}`)

  const failures: DiscoveryError[] = []
  const orientations: { pair: string; direction: SwapDirection }[] = [
    { pair: `${from}/${to}`, direction: 'base-to-quote' },
    { pair: `${to}/${from}`, direction: 'quote-to-base' },
  ]
  for (const { pair, direction } of orientations) {
    try {
      return { ...(await quoteOffer({ ...rest, pair, direction })), pair, direction }
    } catch (error) {
      const err = error instanceof DiscoveryError ? error : new DiscoveryError('feed', String(error))
      // The sources are identical for both orientations, so a total source
      // failure can't be salvaged by flipping the pair.
      if (err.code === 'sources') throw err
      failures.push(err)
    }
  }
  // Surface the most actionable failure: a real error (dead feed, bad data)
  // over "size out of bounds" over "pair not listed at all".
  const real = failures.find((e) => e.code !== 'no-market' && e.code !== 'size')
  throw real ?? failures.find((e) => e.code === 'size') ?? failures[0]
}
