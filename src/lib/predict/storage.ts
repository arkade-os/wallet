import type { PredictKind, PredictNetworkId } from './constants'

export type PredictPositionPhase = 'open' | 'funded' | 'filled' | 'expired' | 'refunded' | 'settled'

export interface PredictPosition {
  id: string
  rfqId?: string
  network: PredictNetworkId
  mode: 'live' | 'demo'
  kind: PredictKind
  strikeCents: string
  stakeSats: string
  payoutSats: string
  multiplier: number
  expiry: number
  deadline: number
  exit: number
  voidAfter: number
  fallbackDelay: number
  finalExitDelay: number
  holderAddress: string
  holderPubkey: string
  deskName: string
  deskPkHex: string
  backupPkHex: string
  beaconTxid: string
  beaconGidx: number
  intentAddress: string
  vaultAddress: string
  phase: PredictPositionPhase
  refundable: boolean
  fundingTxid?: string
  fillTxid?: string
  closeTxid?: string
  settleTxid?: string
  settleCents?: string
  userPayoutSats?: string
  deskPayoutSats?: string
  createdAt: number
}

const STORAGE_PREFIX = 'arkade-predict-positions-v1'

function storageKey(network: PredictNetworkId, pubkey: string): string {
  return `${STORAGE_PREFIX}:${network}:${pubkey.toLowerCase()}`
}

export function readPredictPositions(network: PredictNetworkId, pubkey: string): PredictPosition[] {
  if (!pubkey || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(network, pubkey))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return (parsed as PredictPosition[]).sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export function writePredictPositions(network: PredictNetworkId, pubkey: string, positions: PredictPosition[]): void {
  if (!pubkey || typeof localStorage === 'undefined') return
  try {
    const sorted = [...positions].sort((a, b) => b.createdAt - a.createdAt)
    localStorage.setItem(storageKey(network, pubkey), JSON.stringify(sorted))
  } catch {
    // ignore storage quota errors
  }
}

const PHASE_RANK: Record<PredictPositionPhase, number> = {
  open: 0,
  funded: 1,
  expired: 2,
  filled: 3,
  refunded: 4,
  settled: 5,
}

export function upsertPredictPosition(list: PredictPosition[], next: PredictPosition): PredictPosition[] {
  const idx = list.findIndex(
    (item) => item.id === next.id || (next.vaultAddress && item.vaultAddress === next.vaultAddress),
  )
  if (idx < 0) return [next, ...list].sort((a, b) => b.createdAt - a.createdAt)
  const prev = list[idx]!
  const keepPrevPhase = PHASE_RANK[prev.phase] > PHASE_RANK[next.phase] && next.phase !== 'refunded'
  const merged: PredictPosition = {
    ...prev,
    ...next,
    phase: keepPrevPhase ? prev.phase : next.phase,
    fundingTxid: next.fundingTxid || prev.fundingTxid,
    fillTxid: next.fillTxid || prev.fillTxid,
    closeTxid: next.closeTxid || prev.closeTxid,
    settleTxid: next.settleTxid || prev.settleTxid,
    settleCents: next.settleCents || prev.settleCents,
    userPayoutSats: next.userPayoutSats ?? prev.userPayoutSats,
    deskPayoutSats: next.deskPayoutSats ?? prev.deskPayoutSats,
  }
  const copy = [...list]
  copy[idx] = merged
  return copy.sort((a, b) => b.createdAt - a.createdAt)
}

export function isActivePosition(position: PredictPosition): boolean {
  return position.phase === 'open' || position.phase === 'funded' || position.phase === 'filled'
}
