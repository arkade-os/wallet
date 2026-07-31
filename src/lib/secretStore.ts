import { SecretStorageAdapter } from '../runtime/types'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from './storageKeys'

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

/**
 * Removes every encrypted secret blob.
 *
 * `clearStorage()` wipes `localStorage`, which used to be the whole story. It
 * no longer is: on native the blobs live in the Keychain/Keystore, so a wallet
 * reset would otherwise leave the encrypted mnemonic behind on the device.
 */
export const clearSecrets = async (): Promise<void> => {
  await Promise.all([current.removeItem(MNEMONIC_STORAGE_KEY), current.removeItem(NSEC_STORAGE_KEY)])
}
