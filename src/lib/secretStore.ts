import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from './storageKeys'

export type SecretKey = typeof MNEMONIC_STORAGE_KEY | typeof NSEC_STORAGE_KEY

export interface SecretStore {
  getItem(key: SecretKey): Promise<string | null>
  setItem(key: SecretKey, value: string): Promise<void>
  removeItem(key: SecretKey): Promise<void>
}

type NativeWindow = Window & {
  __ARKADE_NATIVE__?: { version: number }
  __TAURI__?: { core?: { invoke?: <T>(command: string, args: Record<string, unknown>) => Promise<T> } }
}

const keys = [MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY] as const
const present = new Set<SecretKey>()
let initialized = false
let initializing: Promise<void> | undefined

const unavailable = () => new Error('Secure wallet storage is unavailable. Restart the app to retry.')
const isNative = () => {
  const host = window as NativeWindow
  return host.__ARKADE_NATIVE__?.version === 1
}

async function invoke<T>(command: string, key: SecretKey, value?: string): Promise<T> {
  if (!keys.includes(key)) throw unavailable()
  const nativeInvoke = (window as NativeWindow).__TAURI__?.core?.invoke
  if (!nativeInvoke) throw unavailable()
  try {
    return await nativeInvoke<T>(`plugin:wallet|secret_${command}`, value === undefined ? { key } : { key, value })
  } catch {
    throw unavailable()
  }
}

async function readNative(key: SecretKey): Promise<string | null> {
  const value = await invoke<unknown>('get', key)
  if (value !== null && typeof value !== 'string') throw unavailable()
  return value
}

const browserStore: SecretStore = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
}

const nativeStore: SecretStore = {
  getItem: async (key) => {
    const value = await readNative(key)
    if (value === null) present.delete(key)
    else present.add(key)
    return value
  },
  setItem: async (key, value) => {
    await invoke('set', key, value)
    if ((await readNative(key)) !== value) throw unavailable()
    present.add(key)
  },
  removeItem: async (key) => {
    await invoke('remove', key)
    if ((await readNative(key)) !== null) throw unavailable()
    present.delete(key)
    localStorage.removeItem(key)
  },
}

export function initializeSecretStore(): Promise<void> {
  if (!isNative() || initialized) return Promise.resolve()
  if (initializing) return initializing
  initializing = (async () => {
    const found = new Set<SecretKey>()
    for (const key of keys) {
      let stored = await readNative(key)
      const legacy = localStorage.getItem(key)
      if (legacy !== null) {
        if (stored !== null && stored !== legacy) throw unavailable()
        if (stored === null) {
          await invoke('set', key, legacy)
          stored = await readNative(key)
          if (stored !== legacy) throw unavailable()
        }
        // Keep the browser copy until the OS vault has returned the exact encrypted blob.
        localStorage.removeItem(key)
      }
      if (stored !== null) found.add(key)
    }
    present.clear()
    found.forEach((key) => present.add(key))
    initialized = true
  })().finally(() => {
    initializing = undefined
  })
  return initializing
}

export function getSecretStore(): SecretStore {
  if (!isNative()) return browserStore
  if (!initialized) throw unavailable()
  return nativeStore
}

export function hasSecret(key: SecretKey): boolean {
  if (!isNative()) return localStorage.getItem(key) !== null
  if (!initialized) throw unavailable()
  return present.has(key)
}

export async function clearSecrets(): Promise<void> {
  const store = getSecretStore()
  for (const key of keys) await store.removeItem(key)
}
