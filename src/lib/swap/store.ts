import { getStorageItem } from '../storage'

export type AssetSwapStatus = 'pending' | 'fulfilled' | 'cancelled' | 'recoverable'

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
}

const KEY = 'assetSwaps'

export const getAssetSwaps = (): AssetSwap[] => {
  return getStorageItem(KEY, [], (val) => JSON.parse(val))
}

const saveAssetSwaps = (swaps: AssetSwap[]): void => {
  localStorage.setItem(KEY, JSON.stringify(swaps))
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
