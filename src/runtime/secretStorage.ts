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
 * Native secret storage: iOS Keychain / Android Keystore-backed.
 *
 * Backed by `@aparajita/capacitor-secure-storage`. We use its low-level
 * string methods (`getItem`/`setItem`/`removeItem`), which store/return the raw
 * base64 blob with no JSON/date coercion and resolve `null` for a missing key —
 * matching {@link SecretStorageAdapter} exactly. The encryption scheme stays in
 * `mnemonic.ts`/`privateKey.ts`; only the substrate changes from `localStorage`.
 *
 * The plugin is loaded via a memoized dynamic import so it stays out of the PWA
 * bundle's eager graph (this module is also imported by `PwaAppShell` for
 * `localStorageSecretStorage`); the native chunk loads on first secret access.
 *
 * We memoize the *module namespace*, not `m.SecureStorage`, and dereference the
 * plugin inline on each call. `SecureStorage` is a Capacitor plugin proxy whose
 * `get` handler returns a callable for any property name on native; if it were
 * ever the resolution value of a promise (e.g. returning `m.SecureStorage` from
 * a `.then`/async fn), the Promise-resolution procedure would probe its `.then`,
 * treat the proxy as a thenable, and invoke
 * the native bridge's non-existent `then` — "SecureStorage.then() is not
 * implemented on android". Keeping the proxy out of any promise resolution and
 * only ever calling methods on it avoids that.
 *
 * Note: requires `cap sync` (+ `pod install` on iOS) to register the native
 * plugin — done as part of Phase 3 device setup. No migration from the prior
 * localStorage fallback: native is pre-release and the spike is password-only,
 * so a wallet whose blob lived in WebView localStorage simply re-onboards.
 */
let secureModule: Promise<typeof import('@aparajita/capacitor-secure-storage')> | undefined
const secureStorage = () => (secureModule ??= import('@aparajita/capacitor-secure-storage'))

export const nativeSecretStorage: SecretStorageAdapter = {
  getItem: async (key) => (await secureStorage()).SecureStorage.getItem(key),
  setItem: async (key, value) => {
    await (await secureStorage()).SecureStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    await (await secureStorage()).SecureStorage.removeItem(key)
  },
}
