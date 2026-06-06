import { createContext, useContext } from 'react'
import { RuntimeContextValue } from './types'

/**
 * Provides the active app shell's runtime services (capabilities + adapters).
 *
 * The value is supplied by `PwaAppShell` or `CapacitorAppShell`, selected at
 * build time in `src/index.tsx`. There is intentionally no default value: a
 * missing provider is a bootstrap bug, not something screens should silently
 * paper over, so `useRuntime()` throws if no shell is mounted.
 */
export const RuntimeContext = createContext<RuntimeContextValue | null>(null)

export const useRuntime = (): RuntimeContextValue => {
  const ctx = useContext(RuntimeContext)
  if (!ctx) {
    throw new Error('useRuntime must be used within a PwaAppShell or CapacitorAppShell')
  }
  return ctx
}
