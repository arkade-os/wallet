// Module store for the solver cards a user has pinned, on the same shape as
// `lib/loadingStatus`: localStorage is the tape, this module is the one door.
// Not in `storage.ts`, which is a pure serializer façade — one key growing
// listeners there makes the next eight keys ask why they cannot have them.

import { LocalCardInput, validateCard } from '@arkade-os/solver-discovery'
import { getStorageItem } from './storage'

const STORAGE_KEY = 'solverCards'

let version = 0
const listeners = new Set<() => void>()

const isLocalCardInput = (obj: unknown): obj is LocalCardInput => {
  const input = obj as LocalCardInput | null
  return Boolean(
    input &&
      typeof input.network === 'string' &&
      typeof input.label === 'string' &&
      typeof input.card === 'object' &&
      validateCard(input.card).ok,
  )
}

export const readSolverCards = (): LocalCardInput[] => {
  const items = getStorageItem(STORAGE_KEY, [], (val) => JSON.parse(val))
  return Array.isArray(items) ? items.filter(isLocalCardInput) : []
}

/**
 * Writers are spread out — the Solvers screen, and the Nostr restore, which
 * lands a card well after per-network discovery has run — so the version below
 * is what lets React re-derive off a write it cannot otherwise see. Bumped
 * after the write, so a failed one signals nothing.
 */
export const saveSolverCards = (cards: LocalCardInput[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(cards) ? cards.filter(isLocalCardInput) : []))
  version += 1
  listeners.forEach((fn) => fn())
}

export const getSolverCardsVersion = (): number => version

export const subscribeSolverCards = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
