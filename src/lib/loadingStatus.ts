// Module-level pub/sub for loading status messages.
// Providers call setLoadingStatus() at key checkpoints;
// React components consume via useLoadingStatus() hook.

let status = ''
const listeners = new Set<() => void>()

export function setLoadingStatus(msg: string) {
  status = msg
  listeners.forEach((fn) => fn())
}

export function getLoadingStatus() {
  return status
}

export function clearLoadingStatus() {
  setLoadingStatus('')
}

export function subscribeLoadingStatus(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
