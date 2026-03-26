// Module-level ref registry for the Wallet screen's LogoIcon position.
// LoadingLogo reads this to calculate the fly-to-target exit animation destination.

let logoAnchorEl: HTMLDivElement | null = null
let bootAnimRunning = false
let listeners: Set<() => void> = new Set()

export function setLogoAnchor(el: HTMLDivElement | null) {
  logoAnchorEl = el
}

export function getLogoAnchor() {
  return logoAnchorEl
}

export function setBootAnimActive(active: boolean) {
  bootAnimRunning = active
  listeners.forEach((fn) => fn())
}

export function getBootAnimActive() {
  return bootAnimRunning
}

export function subscribeBootAnim(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
