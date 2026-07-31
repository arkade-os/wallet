import { getDeviceRuntime } from './device'
import { HapticKind } from '../runtime/types'

/**
 * Haptic feedback.
 *
 * The gating policy (user setting + reduced-motion) is app behavior and stays
 * here; only the actual trigger is platform-specific and routes through the
 * device adapter: `web-haptics` on the PWA, `@capacitor/haptics` on native
 * (see `src/runtime/device.ts`).
 */

let enabled = true

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

function shouldSkipHaptics(): boolean {
  if (!enabled) return true
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function triggerHaptic(kind: HapticKind): void {
  if (shouldSkipHaptics()) return
  getDeviceRuntime()
    .haptic(kind)
    .catch(() => {})
}

export function hapticTap(): void {
  triggerHaptic('selection')
}

export function hapticLight(): void {
  triggerHaptic('light')
}

export function hapticSubtle(): void {
  triggerHaptic('selection')
}
