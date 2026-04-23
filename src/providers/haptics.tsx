/**
 * HapticProvider — exposes the shared web-haptics singleton (from lib/haptics.ts)
 * via React context, so components can do `const trigger = useHaptic()`.
 *
 * The instance lives in lib/haptics.ts (module singleton) to avoid duplicating
 * the hidden iOS switch element across Provider + standalone callers. This
 * Provider is a thin pass-through, not a second instance.
 *
 * Pattern mapping (per CLAUDE.md):
 *   medium    → primary CTAs (one main action per view)
 *   light     → standard taps (nav links, cards, buttons)
 *   selection → in-view state switches (tabs, toggles)
 *   success / warning / error → form submissions, destructive confirms
 */

import { createContext, ReactNode, useContext } from 'react'
import { triggerHaptic, HapticName } from '../lib/haptics'

type Trigger = (preset: HapticName) => void

const HapticContext = createContext<Trigger>(triggerHaptic)

export function HapticProvider({ children }: { children: ReactNode }) {
  return <HapticContext.Provider value={triggerHaptic}>{children}</HapticContext.Provider>
}

/**
 * Returns a trigger function. Safe to call outside the Provider (falls back to
 * the module singleton directly), so hooks don't need special handling in tests.
 */
export function useHaptic(): Trigger {
  return useContext(HapticContext)
}
