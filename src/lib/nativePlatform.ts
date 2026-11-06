import { isNativeHost } from './nativeBridge'
import { parseAppIntent, protocolIntentSearch, toAppIntentState, type AppIntentState } from './appIntent'

type Listener = { unregister(): Promise<void> }
type HostWindow = Window & {
  __ARKADE_NATIVE__?: { platform: string }
  __TAURI__?: {
    event?: {
      listen(event: string, callback: (event: { payload: unknown }) => void): Promise<() => void>
    }
    core?: {
      invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>
      addPluginListener(plugin: string, event: string, callback: (value: any) => void): Promise<Listener>
    }
  }
}

export const isNativeAndroid = (): boolean =>
  isNativeHost() && (window as HostWindow).__ARKADE_NATIVE__?.platform === 'android'

export const isNativeIOS = (): boolean => isNativeHost() && (window as HostWindow).__ARKADE_NATIVE__?.platform === 'ios'

export const isNativeMobile = (): boolean => isNativeAndroid() || isNativeIOS()

export async function invokeWalletHost<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const core = (window as HostWindow).__TAURI__?.core
  if (!isNativeHost() || !core?.invoke) throw new Error('Native wallet services are unavailable')
  return core.invoke<T>(`plugin:wallet|${command}`, args)
}

export async function listenWalletHost(event: string, callback: (value: any) => void): Promise<() => void> {
  const host = (window as HostWindow).__TAURI__
  if (!isNativeHost()) return () => {}
  if (!isNativeMobile()) {
    if (event !== 'intent') return () => {}
    if (!host?.event?.listen) throw new Error('Native wallet events are unavailable')
    return host.event.listen('wallet:intent', (value) => callback(value.payload))
  }
  const core = host?.core
  if (!core?.addPluginListener) return () => {}
  const listener = await core.addPluginListener('wallet', event, callback)
  return () => {
    void listener.unregister().catch(() => undefined)
  }
}

export function nativeAppIntent(raw: unknown): AppIntentState | undefined {
  if (typeof raw !== 'string' || raw.length > 6_000) return
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return
  }
  if (url.username || url.password || url.port) return
  let search: string | undefined
  if (url.protocol === 'bitcoin:' || url.protocol === 'lightning:') {
    const request =
      url.protocol === 'lightning:'
        ? `bitcoin:?${new URLSearchParams({ lightning: raw.slice('lightning:'.length) })}`
        : raw
    search = `?${new URLSearchParams({ action: 'send', request })}`
  } else if (url.protocol === 'web+arkade:' || url.protocol === 'arkade:') {
    search = protocolIntentSearch(raw.replace(/^arkade:/i, 'web+arkade:'))
  } else if (url.protocol === 'https:' && url.hostname === 'arkade.money' && url.pathname === '/') {
    search = url.search
  }
  if (!search) return
  const parsed = parseAppIntent(search)
  return parsed ? toAppIntentState(parsed) : undefined
}
