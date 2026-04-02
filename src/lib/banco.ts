export type BancoSwapStatus = 'pending' | 'fulfilled' | 'cancelled'

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
  swaps.unshift(swap)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(swaps))
}

export function updateSwap(id: string, updates: Partial<BancoSwap>): void {
  const swaps = getSwaps()
  const idx = swaps.findIndex((s) => s.id === id)
  if (idx === -1) return
  swaps[idx] = { ...swaps[idx], ...updates }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(swaps))
}
