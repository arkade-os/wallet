type Request = { id: number; resolve: (pin: string) => void; reject: (error: Error) => void }

let request: Request | undefined
let nextId = 0
let host: { allowed: () => boolean } | undefined
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())
const failure = (code: 'USER_CANCELLED' | 'CARD_BUSY') =>
  Object.assign(
    new Error(code === 'USER_CANCELLED' ? 'Card signing cancelled.' : 'A card signing request is already in progress.'),
    { code },
  )

export const getNativeSigningPinRequest = (): number | undefined => request?.id

export function subscribeNativeSigningPin(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function registerNativeSigningPinHost(allowed: () => boolean): () => void {
  const owner = { allowed }
  if (host) throw new Error('A signing PIN prompt is already mounted')
  host = owner
  return () => {
    if (host !== owner) return
    host = undefined
    cancelNativeSigningPin()
  }
}

export function requestNativeSigningPin(): Promise<string> {
  if (!host?.allowed()) return Promise.reject(failure('USER_CANCELLED'))
  if (request) return Promise.reject(failure('CARD_BUSY'))
  return new Promise((resolve, reject) => {
    request = { id: ++nextId, resolve, reject }
    notify()
  })
}

export function submitNativeSigningPin(id: number, pin: string): boolean {
  if (request?.id !== id || !/^[0-9]{6,16}$/.test(pin)) return false
  if (!host?.allowed()) {
    cancelNativeSigningPin(id)
    return false
  }
  const current = request
  request = undefined
  notify()
  current.resolve(pin)
  return true
}

export function cancelNativeSigningPin(id = request?.id): void {
  if (!request || request.id !== id) return
  const current = request
  request = undefined
  notify()
  current.reject(failure('USER_CANCELLED'))
}
