import type { SolverRoutingPreferences } from '@arkade-os/solver-discovery'

const STORAGE_KEY = 'solverRouting'
let version = 0
const listeners = new Set<() => void>()
const onStorage = (event: StorageEvent) => {
  if (event.key === STORAGE_KEY || event.key === null) {
    version += 1
    listeners.forEach((fn) => fn())
  }
}
const clean = (value: unknown): SolverRoutingPreferences => {
  const prefs = value && typeof value === 'object' ? (value as SolverRoutingPreferences) : {}
  return {
    mode: prefs.mode === 'usage' || prefs.mode === 'cost' ? prefs.mode : 'manual',
    priority: Array.isArray(prefs.priority)
      ? [...new Set(prefs.priority.filter((id) => typeof id === 'string' && id))]
      : [],
  }
}
const read = (): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
export const readSolverRouting = (network: string, direction: string): SolverRoutingPreferences =>
  clean(read()[JSON.stringify([network, direction])])
export const saveSolverRouting = (network: string, direction: string, prefs: SolverRoutingPreferences): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), [JSON.stringify([network, direction])]: clean(prefs) }))
  version += 1
  listeners.forEach((fn) => fn())
}
export const getSolverRoutingVersion = (): number => version
export const subscribeSolverRouting = (fn: () => void): (() => void) => {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(fn)
  return () => {
    if (listeners.delete(fn) && listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}
