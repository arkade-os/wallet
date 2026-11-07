type NativeWindow = Window & {
  __ARKADE_NATIVE__?: { version: number }
  __TAURI__?: { core?: { invoke?: unknown } }
}

export const isNativeHost = (): boolean => {
  const host = window as NativeWindow
  return host.__ARKADE_NATIVE__?.version === 1 && typeof host.__TAURI__?.core?.invoke === 'function'
}
