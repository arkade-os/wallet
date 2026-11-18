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

// Haptics follow their own setting only. They are not tied to reduced
// motion: for people who turn animation off, a tap they can feel is the
// feedback that remains.
function shouldSkipHaptics(): boolean {
  if (!enabled) return true
  return typeof window === 'undefined'
}

function triggerHaptic(pattern: 'selection' | 'light' | 'medium' | 'success' | 'warning'): void {
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

/** A payment sent or received. */
export function hapticSuccess(): void {
  triggerHaptic('success')
}

/** Something the person should notice: an amount over balance, a rejected address, a failed payment. */
export function hapticWarning(): void {
  triggerHaptic('warning')
}
