import { SecretStorageAdapter } from '../runtime/types'

/**
 * Injectable seam for encrypted-secret persistence.
 *
 * `src/lib/mnemonic.ts` and `src/lib/privateKey.ts` read/write the encrypted
 * mnemonic / private-key blob through the store returned by `getSecretStore()`.
 * The active app shell injects its runtime adapter once at boot via
 * `setSecretStore(runtime.secretStorage)`. The default is `localStorage`, so the
 * PWA, unit tests, and any code importing these libs before a shell mounts keep
 * the original synchronous-localStorage behavior.
 */
const localStorageStore: SecretStorageAdapter = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => {
    localStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    localStorage.removeItem(key)
  },
}

let current: SecretStorageAdapter = localStorageStore

export const setSecretStore = (store: SecretStorageAdapter): void => {
  current = store
}

export const getSecretStore = (): SecretStorageAdapter => current
