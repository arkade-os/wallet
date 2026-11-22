import { useSyncExternalStore } from 'react'

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
    // ignore storage errors
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
