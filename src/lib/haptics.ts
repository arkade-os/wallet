/**
 * Haptic feedback — module-level singleton wrapping web-haptics.
 * Respects prefers-reduced-motion. In React, prefer `useHaptic()` from
 * providers/haptics.tsx; outside React or for small leaf components, the
 * direct functions below are fine.
 */

import React from 'react'
import { WebHaptics } from 'web-haptics'

/**
 * Preset names we accept. web-haptics' `HapticPreset` is the object shape
 * `{ pattern: Vibration[] }`; we want the name-union for type-safe call sites.
 */
export type HapticName =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'soft'
  | 'rigid'
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'
  | 'nudge'
  | 'buzz'

let instance: WebHaptics | null = null
let enabled = true
let reducedMotion = false
let reducedMotionInitialized = false

function ensureReducedMotionInit(): void {
  if (reducedMotionInitialized) return
  if (typeof window === 'undefined') return
  reducedMotionInitialized = true
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion = mq.matches
    mq.addEventListener('change', (e) => {
      reducedMotion = e.matches
    })
  } catch {
    /* ignore */
  }
}

function getInstance(): WebHaptics | null {
  if (typeof window === 'undefined') return null
  if (instance) return instance
  // Do NOT gate on WebHaptics.isSupported. On iOS Safari that returns false
  // even though the library can fall back to the hidden-switch Taptic hack.
  try {
    instance = new WebHaptics()
  } catch {
    instance = null
  }
  return instance
}

export function triggerHaptic(preset: HapticName): void {
  // Init BEFORE the enabled/reducedMotion check so the first tap can't slip
  // through while the media query is still loading.
  ensureReducedMotionInit()
  if (!enabled || reducedMotion) return
  getInstance()
    ?.trigger(preset)
    .catch(() => {})
}

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

// Legacy call sites. CLAUDE.md pattern mapping:
//   tap → 'light' (standard tap)
//   light → 'light' (same as tap now — both are "standard tap")
//   subtle → 'selection' (dismiss / expand / tab switch)
export function hapticTap(): void {
  triggerHaptic('light')
}
export function hapticLight(): void {
  triggerHaptic('light')
}
export function hapticSubtle(): void {
  triggerHaptic('selection')
}

/**
 * Hook: wrap a `(checked) => void` callback so it fires a haptic before
 * forwarding. Used by shadcn primitives (Checkbox, Switch) where we want
 * 'selection' by default on change. Safe when callers pass unmemoized props
 * — the inner callback re-memoizes on parent change, same cost as useCallback.
 */
export function useHapticCheckedChange<T extends boolean | 'indeterminate'>(
  onCheckedChange?: (checked: T) => void,
  preset: HapticName = 'selection',
): (checked: T) => void {
  return React.useCallback(
    (checked: T) => {
      triggerHaptic(preset)
      onCheckedChange?.(checked)
    },
    [onCheckedChange, preset],
  )
}
