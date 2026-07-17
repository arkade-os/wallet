import { getStorageItem } from '../storage'
import { consoleError } from '../logs'
import type { Tx } from '../types'
import { designatedAccountCurrency } from '../accountAssets'

export type AssetSwapStatus = 'pending' | 'cancelling' | 'fulfilled' | 'cancelled' | 'recoverable'

export interface AssetSwapQuoteSnapshot {
  fromName: string
  fromTicker: string
  fromDecimals: number
  toName: string
  toTicker: string
  toDecimals: number
  feeBps: number
  rate: string
  fiatCurrency: string
  fromFiatAmount: number
  toFiatAmount: number
  quotedAt: number
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
    return parsed.filter((s) => s && typeof s.id === 'string' && typeof s.offerHex === 'string')
  })
}

// persistence must never fail the caller: by the time a swap is stored the
// funding tx is already broadcast, and the offer stays recoverable from it
const saveAssetSwaps = (swaps: AssetSwap[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(swaps))
  } catch (err) {
    consoleError(err, 'failed to persist asset swaps')
  }
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

/** Collapse the funding and fill wallet rows into one persisted swap activity. */
export const mergeAssetSwapActivity = (txs: Tx[], swaps = getAssetSwaps(), network?: string): Tx[] => {
  const claimed = new Set<Tx>()
  const activities = swaps.map<Tx>((swap) => {
    const members = txs.filter((tx) => {
      const ids = [tx.boardingTxid, tx.redeemTxid, tx.roundTxid]
      const match = ids.includes(swap.fundingTxid) || Boolean(swap.spentTxid && ids.includes(swap.spentTxid))
      if (match) claimed.add(tx)
      return match
    })
    const quote = swap.quote
    const status =
      swap.status === 'fulfilled'
        ? 'completed'
        : swap.status === 'cancelled'
          ? 'cancelled'
          : swap.status === 'recoverable'
            ? 'recoverable'
            : 'pending'
    const fill = swap.spentTxid
      ? members.find((tx) => [tx.boardingTxid, tx.redeemTxid, tx.roundTxid].includes(swap.spentTxid!))
      : undefined
    const receivedAsset = fill?.assets?.find((asset) => asset.assetId === swap.toAsset && asset.amount > BigInt(0))
    const receivedAmount =
      swap.toAsset === 'btc' && fill?.amount && fill.amount > 0
        ? BigInt(fill.amount)
        : (receivedAsset?.amount ?? BigInt(swap.toAmount))
    const fallbackTicker = (assetId: string) =>
      assetId === 'btc' ? 'BTC' : (designatedAccountCurrency(network, assetId) ?? assetId.slice(0, 8))
    return {
      amount: members[0]?.amount ?? 0,
      boardingTxid: '',
      createdAt: Math.floor(swap.createdAt / 1000),
      explorable: undefined,
      preconfirmed: status === 'pending',
      redeemTxid: swap.spentTxid ?? swap.fundingTxid,
      roundTxid: '',
      settled: status !== 'pending',
      type: 'swap',
      assetSwap: {
        fromAssetId: swap.fromAsset,
        fromTicker: quote?.fromTicker ?? fallbackTicker(swap.fromAsset),
        fromDecimals: quote?.fromDecimals,
        fromAmount: BigInt(swap.fromAmount),
        toAssetId: swap.toAsset,
        toTicker: quote?.toTicker ?? fallbackTicker(swap.toAsset),
        toDecimals: quote?.toDecimals,
        toAmount: receivedAmount,
        fiatAmount: quote?.fromFiatAmount,
        fiatCurrency: quote?.fiatCurrency,
        toFiatAmount: quote?.toFiatAmount,
        feeBps: quote?.feeBps,
        rate: quote?.rate,
        quotedAt: quote?.quotedAt,
        completedAt: swap.completedAt,
        fundingTxid: swap.fundingTxid,
        fillTxid: swap.spentTxid,
        status,
      },
    }
  })

  return [...activities, ...txs.filter((tx) => !claimed.has(tx))].sort((a, b) => b.createdAt - a.createdAt)
}
