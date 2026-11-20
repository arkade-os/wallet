import { useSyncExternalStore } from 'react'

/**
 * Which unit leads the Home balance: the display currency, or Bitcoin in the unit set in Settings.
 * A tap on the balance flips it. It is a per-device view choice, so it lives in localStorage rather
 * than in the backed-up config, and it falls back to memory when storage is unavailable.
 */
export type BalanceLead = 'currency' | 'bitcoin'

const KEY = 'home.balanceLead'
const listeners = new Set<() => void>()
let fallback: BalanceLead = 'currency'

export const getBalanceLead = (): BalanceLead => {
  try {
    return localStorage.getItem(KEY) === 'bitcoin' ? 'bitcoin' : 'currency'
  } catch {
    return fallback
  }
}

export const toggleBalanceLead = (): void => {
  const next: BalanceLead = getBalanceLead() === 'bitcoin' ? 'currency' : 'bitcoin'
  fallback = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Memory carries it for this visit.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useBalanceLead = (): BalanceLead => useSyncExternalStore(subscribe, getBalanceLead, getBalanceLead)
