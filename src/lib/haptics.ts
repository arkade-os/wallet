import { WebHaptics } from 'web-haptics'

let enabled = true
let haptics: WebHaptics | null = null

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

function getHaptics(): WebHaptics | null {
  if (haptics) return haptics
  if (typeof window === 'undefined') return null
  haptics = new WebHaptics()
  return haptics
}

function shouldSkipHaptics(): boolean {
  if (!enabled) return true
  return typeof window === 'undefined'
}

function triggerHaptic(pattern: 'selection' | 'light' | 'medium' | 'success'): void {
  if (shouldSkipHaptics()) return
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

export function hapticSuccess(): void {
  triggerHaptic('success')
}
