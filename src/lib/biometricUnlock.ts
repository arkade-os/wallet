import { hex } from '@scure/base'
import { SecurityRuntimeAdapter } from '../runtime/types'
import { authenticateUser, isBiometricsSupported, registerUser } from './biometrics'

/**
 * Runtime-neutral biometric unlock.
 *
 * Both runtimes implement the same idea, which the PWA's design already made
 * portable: the "biometric" is not a signing key, it is a vault holding a
 * random 21-byte value that *is* the AES-GCM encryption password. Unlocking
 * means proving identity and getting that password back, so the decryption
 * flow in `mnemonic.ts` / `privateKey.ts` is identical either way.
 *
 * - PWA: WebAuthn (`src/lib/biometrics.ts`). The password is the passkey's
 *   `user.id`, returned as `userHandle` on authentication.
 * - Native: a biometric prompt gating a read from native secure storage.
 *   WebAuthn is unusable here because its relying-party ID and origin check
 *   are bound to `window.location.hostname`, which is `localhost` under
 *   Capacitor (see CAPACITOR.plan.md § WebAuthn and Biometrics).
 *
 * The active shell injects its adapter via {@link setSecurityRuntime}; absent
 * one (PWA, unit tests) this falls back to WebAuthn.
 */

let security: SecurityRuntimeAdapter | undefined

/**
 * Cached availability, so the gate can stay synchronous for render.
 *
 * Native availability needs an async plugin call, so the shell probes it at
 * mount and pushes the result here. Until it resolves the gate reads false,
 * which only hides a "use biometrics" button for the few ms before any
 * password screen can be reached.
 */
let nativeAvailable = false

export const setSecurityRuntime = (adapter: SecurityRuntimeAdapter): void => {
  security = adapter
  adapter
    .isBiometricUnlockAvailable()
    .then((available) => {
      nativeAvailable = available
    })
    .catch(() => {
      nativeAvailable = false
    })
}

/** Synchronous because it gates a button during render. */
export const isBiometricUnlockSupported = (): boolean =>
  security ? nativeAvailable : isBiometricsSupported()

/**
 * Enrolls biometric unlock and returns the generated encryption password.
 *
 * `passkeyId` identifies the credential to authenticate against later. Native
 * secure storage holds a single unlock secret rather than a credential set, so
 * it returns a fixed marker — enough for the existing wallet state, which only
 * uses the value to remember that biometric unlock was set up.
 */
export const registerBiometricUnlock = async (): Promise<{ password: string; passkeyId: string }> => {
  if (!security) return registerUser()

  const password = hex.encode(crypto.getRandomValues(new Uint8Array(21)))
  await security.saveBiometricUnlockSecret(password)
  return { password, passkeyId: NATIVE_PASSKEY_ID }
}

/** Marks wallet state as biometric-unlockable on native, where there is no credential id. */
export const NATIVE_PASSKEY_ID = 'native-biometric'

/** Prompts for biometrics and returns the stored encryption password. */
export const authenticateBiometricUnlock = async (passkeyId: string | undefined): Promise<string> => {
  if (!security) return authenticateUser(passkeyId)

  const secret = await security.getBiometricUnlockSecret()
  if (!secret) throw new Error('No biometric unlock secret stored on this device')
  return secret
}

/** Removes the stored secret. No-op on the PWA, where the passkey is the store. */
export const clearBiometricUnlock = async (): Promise<void> => {
  await security?.clearBiometricUnlockSecret()
}
