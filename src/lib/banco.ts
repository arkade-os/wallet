export type BancoSwapStatus = 'pending' | 'fulfilled' | 'cancelled' | 'recoverable'

export interface BancoSwap {
  id: string
  pair: string
  payAmount: number
  payAsset: string
  receiveAmount: number
  receiveAsset: string
  swapAddress: string
  swapPkScript: string
  offerHex: string
  fundingTxid: string
  /** Txid of the ark tx that spent the swap VTXO (set once fulfilled). */
  spentTxid?: string
  status: BancoSwapStatus
  createdAt: number
  cancelAt: number
}

const STORAGE_KEY = 'banco-swaps'

export function getSwaps(): BancoSwap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addSwap(swap: BancoSwap): void {
  const swaps = getSwaps()
  if (swaps.some((s) => s.id === swap.id)) return // dedup
  swaps.unshift(swap)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(swaps))
}

export function deduplicateSwaps(): void {
  const swaps = getSwaps()
  const seen = new Set<string>()
  const deduped = swaps.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
  if (deduped.length !== swaps.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped))
  }
}

export function updateSwap(id: string, updates: Partial<BancoSwap>): void {
  const swaps = getSwaps()
  const idx = swaps.findIndex((s) => s.id === id)
  if (idx === -1) return
  swaps[idx] = { ...swaps[idx], ...updates }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(swaps))
}
