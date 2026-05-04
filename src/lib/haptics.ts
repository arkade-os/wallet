// Cross-platform haptic feedback
// Android: navigator.vibrate()
// iOS 18+: hidden <input type="checkbox" switch> hack triggers Taptic Engine
// Desktop / older iOS: silent no-op

let iosLabel: HTMLLabelElement | null = null
let enabled = true
let hapticId = 0

export function setHapticsEnabled(value: boolean): void {
  enabled = value
}

function getIosHapticLabel(): HTMLLabelElement | null {
  if (iosLabel) return iosLabel
  try {
    const id = `haptic-switch-${++hapticId}`
    const label = document.createElement('label')
    label.htmlFor = id
    label.textContent = 'Haptic feedback'
    label.style.position = 'fixed'
    label.style.left = '0'
    label.style.bottom = '0'
    label.style.display = 'none'
    label.style.userSelect = 'none'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.setAttribute('switch', '')
    checkbox.id = id
    checkbox.style.all = 'initial'
    checkbox.style.appearance = 'auto'
    checkbox.style.display = 'none'

    label.appendChild(checkbox)
    document.body.appendChild(label)
    iosLabel = label
    return label
  } catch {
    return null
  }
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isAppleMobile = /iPhone|iPad|iPod/.test(ua)
  const isIpadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isAppleMobile || isIpadOS
}

function triggerHaptic(durationMs: number): void {
  if (!enabled) return
  if (typeof navigator === 'undefined') return
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
