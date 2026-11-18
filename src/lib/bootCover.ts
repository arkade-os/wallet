// Whether the boot cover is still on screen. Home holds its entrance until the
// cover clears, so the first frame the user sees is the arrival, not the tail of it.

let bootAnimRunning = false
const listeners: Set<() => void> = new Set()

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
