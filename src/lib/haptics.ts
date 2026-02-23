// Cross-platform haptic feedback
// Android: navigator.vibrate()
// iOS 18+: hidden <input type="checkbox" switch> hack triggers Taptic Engine
// Desktop / older iOS: silent no-op

let iosLabel: HTMLLabelElement | null = null
let enabled = true

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

function getIosHapticLabel(): HTMLLabelElement | null {
  if (iosLabel) return iosLabel
  try {
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.setAttribute('switch', '')
    checkbox.id = 'haptic-switch'
    checkbox.style.position = 'fixed'
    checkbox.style.left = '-9999px'
    checkbox.style.opacity = '0'
    checkbox.style.pointerEvents = 'none'

    const label = document.createElement('label')
    label.htmlFor = 'haptic-switch'
    label.style.position = 'fixed'
    label.style.left = '-9999px'
    label.style.opacity = '0'
    label.style.pointerEvents = 'none'

    document.body.appendChild(checkbox)
    document.body.appendChild(label)
    iosLabel = label
    return label
  } catch {
    return null
  }
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

function triggerHaptic(durationMs: number): void {
  if (!enabled) return
  if (isIos()) {
    const label = getIosHapticLabel()
    if (label) label.click()
  } else if (navigator.vibrate) {
    navigator.vibrate(durationMs)
  }
}

export function hapticTap(): void {
  triggerHaptic(8)
}

export function hapticLight(): void {
  triggerHaptic(4)
}

export function hapticSubtle(): void {
  triggerHaptic(2)
}
