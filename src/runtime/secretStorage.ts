import { SecretStorageAdapter } from './types'

/**
 * Secret-blob storage adapters (encrypted mnemonic / private-key).
 *
 * The encryption scheme (AES-GCM-256 + PBKDF2) lives in `src/lib/mnemonic.ts`
 * and `src/lib/privateKey.ts` and is unchanged; only the persistence substrate
 * differs per runtime (see CAPACITOR.plan.md § Storage and Secrets). The active
 * shell injects its adapter into the secret-store seam at boot via
 * `setSecretStore` (see `src/lib/secretStore.ts`).
 */

/** PWA: encrypted blob in `localStorage`, identical to the original behavior. */
export const localStorageSecretStorage: SecretStorageAdapter = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => {
    localStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    localStorage.removeItem(key)
  },
}

/**
 * Native secret storage.
 *
 * TODO(capacitor, Phase 2/3 device work): back this with the iOS Keychain /
 * Android Keystore via `@aparajita/capacitor-secure-storage` (see
 * CAPACITOR.plan.md § Storage and Secrets and the Phase 0 plugin baseline).
 * Installing the plugin requires `cap sync` and on-device validation, which is
 * out of scope for the boundary pass; until then the native runtime uses the
 * WebView `localStorage` substrate so the encrypted blob still persists. This is
 * the single deferred native-plugin item tracked in the parity map.
 */
export const nativeSecretStorage: SecretStorageAdapter = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => {
    localStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    localStorage.removeItem(key)
  },
}
