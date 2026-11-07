const handlers: { onBack: () => void }[] = []
const subscribers = new Set<() => void>()

export const getNativeBackCount = (): number => handlers.length

export function subscribeNativeBack(callback: () => void): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function registerNativeBack(onBack: () => void): () => void {
  const handler = { onBack }
  handlers.push(handler)
  subscribers.forEach((callback) => callback())
  return () => {
    const index = handlers.indexOf(handler)
    if (index === -1) return
    handlers.splice(index, 1)
    subscribers.forEach((callback) => callback())
  }
}

export function handleNativeBack(): boolean {
  const handler = handlers.at(-1)
  if (!handler) return false
  handler.onBack()
  return true
}
