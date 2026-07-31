import { SecurityRuntimeAdapter } from './types'

/**
 * Native biometric unlock: a biometric prompt gating a read of the unlock
 * secret from native secure storage (iOS Keychain / Android Keystore).
 *
 * SECURITY NOTE — this is authenticate-then-fetch, not hardware-bound
 * biometric gating. The prompt and the secret read are two separate
 * operations, so the secret's availability is not cryptographically tied to a
 * successful biometric authentication; anything able to run code in the app's
 * own process could read it without prompting. CAPACITOR.plan.md § WebAuthn
 * and Biometrics calls for a first-party plugin that binds the secret to the
 * platform's biometric access control (iOS `kSecAccessControlBiometryCurrentSet`,
 * Android Keystore `setUserAuthenticationRequired`) before public release;
 * `@aparajita/capacitor-secure-storage` exposes keychain *accessibility*
 * levels but not access *control*, so it cannot express that binding.
 *
 * That stronger version is release work and is deliberately not built here.
 */
let biometricModule: Promise<typeof import('@aparajita/capacitor-biometric-auth')> | undefined
const biometricPlugin = () => (biometricModule ??= import('@aparajita/capacitor-biometric-auth'))

let secureModule: Promise<typeof import('@aparajita/capacitor-secure-storage')> | undefined
const secureStorage = () => (secureModule ??= import('@aparajita/capacitor-secure-storage'))

/** Distinct from the wallet secret keys so a reset can clear them independently. */
const UNLOCK_SECRET_KEY = 'biometric_unlock_secret'

const authenticate = async (reason: string): Promise<void> => {
  const { BiometricAuth } = await biometricPlugin()
  await BiometricAuth.authenticate({
    reason,
    cancelTitle: 'Cancel',
    androidTitle: 'Unlock Arkade Wallet',
    // Falls back to device PIN/pattern/password, matching the platform
    // behavior users expect when biometry fails or is temporarily locked out.
    allowDeviceCredential: true,
  })
}

export const nativeSecurity: SecurityRuntimeAdapter = {
  isBiometricUnlockAvailable: async () => {
    try {
      const { BiometricAuth } = await biometricPlugin()
      const { isAvailable } = await BiometricAuth.checkBiometry()
      return isAvailable
    } catch {
      return false
    }
  },

  // Enrollment prompts too, so the user confirms it is their device before a
  // password that can decrypt the wallet is written.
  saveBiometricUnlockSecret: async (secret) => {
    await authenticate('Confirm your identity to enable biometric unlock')
    await (await secureStorage()).SecureStorage.setItem(UNLOCK_SECRET_KEY, secret)
  },

  getBiometricUnlockSecret: async () => {
    await authenticate('Unlock your Arkade wallet')
    return (await (await secureStorage()).SecureStorage.getItem(UNLOCK_SECRET_KEY)) ?? undefined
  },

  // No prompt: removing access is not a privileged operation.
  clearBiometricUnlockSecret: async () => {
    await (await secureStorage()).SecureStorage.removeItem(UNLOCK_SECRET_KEY)
  },
}
