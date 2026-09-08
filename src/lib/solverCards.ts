// Module-level store for the solver cards a user has pinned, on the same shape
// as `loadingStatus`: localStorage is the backing tape, this module is the one
// door, and React reads it through `useSyncExternalStore`.
//
// It lives outside `storage.ts` because it is not a plain serializer pair. A
// pinned card is a market source, and the writers are spread out — the Solvers
// screen, and the Nostr restore, which lands one well after per-network
// discovery has already run. Without a subscription the swap screen sat on
// "coming soon" with the restored card visible in Settings until the app was
// reloaded.

import { LocalCardInput, validateCard } from '@arkade-os/solver-discovery'
import { getStorageItem } from './storage'

const STORAGE_KEY = 'solverCards'

/** Bumped on every write. Callers key off it rather than the card list itself,
 * so a re-derive is one integer comparison and never a deep compare. */
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

export const saveSolverCards = (cards: LocalCardInput[]): void => {
  const data = Array.isArray(cards) ? cards.filter(isLocalCardInput) : []
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  // Unconditional: dropping the last card changes the market set as surely as
  // adding one does.
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
