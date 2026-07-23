import { getStorageItem, setStorageItemSafely } from '../storage'

export type AssetSwapStatus = 'pending' | 'cancelling' | 'fulfilled' | 'cancelled' | 'recoverable'

/** Display facts frozen at quote time — only what the activity UI reads.
 * Every field is optional: a restore can only backfill what is recoverable
 * (feeBps from the market card), and every consumer falls back per-field.
 * TODO: once fee bps rides in a packet inside the funding tx, feeBps stops
 * being a quote-time fact — read it from the tx (creation and restore alike)
 * and drop the field here. */
export interface AssetSwapQuoteSnapshot {
  fromTicker?: string
  fromDecimals?: number
  toTicker?: string
  toDecimals?: number
  feeBps?: number
  fiatCurrency?: string
  fromFiatAmount?: number
}

export interface AssetSwap {
  /** Funding txid — the swap's identity. */
  id: string
  /** 'btc' or a 68-hex asset id. */
  fromAsset: string
  toAsset: string
  /** Atomic amounts as strings (bigint is not JSON-safe). */
  fromAmount: string
  /** The covenant wantAmount — a floor, the fill pays >= this. */
  toAmount: string
  swapAddress: string
  /** Hex pkScript of the swap contract — the indexer monitoring key. */
  swapPkScript: string
  /** TLV offer — needed to rebuild the contract for cancel. */
  offerHex: string
  fundingTxid: string
  spentTxid?: string
  status: AssetSwapStatus
  createdAt: number
  completedAt?: number
  quote?: AssetSwapQuoteSnapshot
}

const KEY = 'assetSwaps'

export const getAssetSwaps = (): AssetSwap[] => {
  return getStorageItem(KEY, [], (val) => {
    const parsed = JSON.parse(val)
    if (!Array.isArray(parsed)) return []
    // insertion order is not chronological — the restore scan rebuilds records
    // in tx-scan order — so sort at read to keep newest-first canonical for
    // every consumer (including the activity merge)
    return parsed
      .filter((s) => s && typeof s.id === 'string' && typeof s.offerHex === 'string')
      .sort((a, b) => b.createdAt - a.createdAt)
  })
}

// persistence must never fail the caller: by the time a swap is stored the
// funding tx is already broadcast, and the offer stays recoverable from it
const saveAssetSwaps = (swaps: AssetSwap[]): void => {
  setStorageItemSafely(KEY, JSON.stringify(swaps), 'failed to persist asset swaps')
}

/** Prepend a swap; no-op if the id is already stored. */
export const addAssetSwap = (swap: AssetSwap): AssetSwap[] => {
  const swaps = getAssetSwaps()
  if (!swaps.some((s) => s.id === swap.id)) swaps.unshift(swap)
  saveAssetSwaps(swaps)
  return swaps
}

export const updateAssetSwap = (id: string, changes: Partial<AssetSwap>): AssetSwap[] => {
  const swaps = getAssetSwaps().map((s) => (s.id === id ? { ...s, ...changes } : s))
  saveAssetSwaps(swaps)
  return swaps
}
