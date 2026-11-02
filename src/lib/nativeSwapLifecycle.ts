import { CardRequiredError, isNativeHost, subscribeNativeCardState } from './nativeBridge'
import { canRequestNativeSigning, nativeSigningInterrupted } from './nativeSignerAvailability'

type Driver = { start(): Promise<void>; stop(): Promise<void> }

export function attachNativeSwapLifecycle(client: Driver, hardware: boolean, paused: () => void): () => void {
  if (!isNativeHost()) return () => {}
  let suspended = false
  let disposed = false
  let stopping = Promise.resolve()
  const start = client.start.bind(client)
  const available = () => !disposed && !suspended && (!hardware || canRequestNativeSigning())
  const stop = () => {
    stopping = stopping.then(() => client.stop()).catch(() => undefined)
    paused()
    return stopping
  }
  client.start = async () => {
    await stopping
    if (!available()) throw hardware ? new CardRequiredError() : new Error('Open the app to resume this payment')
    await start()
    if (!available()) {
      await stop()
      throw hardware ? new CardRequiredError() : new Error('Open the app to resume this payment')
    }
  }
  const onPause = () => {
    suspended = true
    void stop()
  }
  const onResume = () => {
    suspended = false
    if (!hardware && !disposed) void client.start().catch(() => undefined)
  }
  const unsubscribe = hardware
    ? subscribeNativeCardState(() => {
        if (nativeSigningInterrupted()) void stop()
      })
    : () => {}
  window.addEventListener('arkade-native-paused', onPause)
  window.addEventListener('arkade-native-resumed', onResume)
  return () => {
    disposed = true
    unsubscribe()
    window.removeEventListener('arkade-native-paused', onPause)
    window.removeEventListener('arkade-native-resumed', onResume)
  }
}
