import { WebHaptics } from 'web-haptics'

type HapticPattern = 'selection' | 'light' | 'medium'

let enabled = true
let haptics: WebHaptics | null = null

const nativePatterns: Record<HapticPattern, number | number[]> = {
  selection: 10,
  light: 18,
  medium: 28,
}

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

function getHaptics(): WebHaptics | null {
  if (haptics) return haptics
  if (typeof window === 'undefined') return null
  haptics = new WebHaptics()
  return haptics
}

function triggerHaptic(pattern: HapticPattern): void {
  if (!enabled) return

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    const triggered = navigator.vibrate(nativePatterns[pattern])
    if (triggered) return
  }

  getHaptics()
    ?.trigger(pattern)
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
