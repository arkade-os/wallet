import { isNativeHost } from './nativeBridge'

type Driver = { start(): Promise<void>; stop(): Promise<void> }

export function attachNativeSwapLifecycle(client: Driver): () => void {
  if (!isNativeHost()) return () => {}
  let suspended = false
  let disposed = false
  let stopping = Promise.resolve()
  const start = client.start.bind(client)
  const available = () => !disposed && !suspended
  const stop = () => {
    stopping = stopping.then(() => client.stop()).catch(() => undefined)
    return stopping
  }
  client.start = async () => {
    await stopping
    if (!available()) throw new Error('Open the app to resume this payment')
    await start()
    if (!available()) {
      await stop()
      throw new Error('Open the app to resume this payment')
    }
  }
  const onPause = () => {
    suspended = true
    void stop()
  }
  const onResume = () => {
    suspended = false
    if (!disposed) void client.start().catch(() => undefined)
  }
  window.addEventListener('arkade-native-paused', onPause)
  window.addEventListener('arkade-native-resumed', onResume)
  return () => {
    disposed = true
    window.removeEventListener('arkade-native-paused', onPause)
    window.removeEventListener('arkade-native-resumed', onResume)
  }
}
