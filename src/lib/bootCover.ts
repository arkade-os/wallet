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
