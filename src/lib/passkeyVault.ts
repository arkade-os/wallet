import { assertPrf } from './passkey'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY, PRF_MNEMONIC_STORAGE_KEY } from './storageKeys'

/**
 * PRF vault: the mnemonic encrypted with a key derived from the passkey's PRF
 * output (HKDF-SHA-256 → AES-GCM-256). The envelope binary layout matches the
 * password vaults in mnemonic.ts (base64 of salt(16) || iv(12) || ciphertext),
 * but the KDF is HKDF over the PRF secret instead of PBKDF2 over a password.
 * The credentialId is stored alongside so unlock knows which passkey to assert.
 */
export type PrfVault = { v: 1; credentialId: string; data: string }

const HKDF_INFO = new TextEncoder().encode('arkade-wallet/aes-gcm/v1')

export const hasPrfMnemonic = (): boolean => {
  return localStorage.getItem(PRF_MNEMONIC_STORAGE_KEY) !== null
}

export const getPrfVault = (): PrfVault | null => {
  const raw = localStorage.getItem(PRF_MNEMONIC_STORAGE_KEY)
  if (!raw) return null
  try {
    const vault = JSON.parse(raw)
    if (vault?.v !== 1 || typeof vault.credentialId !== 'string' || typeof vault.data !== 'string') return null
    return vault as PrfVault
  } catch {
    return null
  }
}

export const setMnemonicWithPrf = async (
  mnemonic: string,
  credentialId: string,
  prfOutput: Uint8Array,
): Promise<void> => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAesKeyFromPrf(prfOutput, salt, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(mnemonic))

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  const vault: PrfVault = { v: 1, credentialId, data: btoa(String.fromCharCode(...combined)) }
  localStorage.setItem(PRF_MNEMONIC_STORAGE_KEY, JSON.stringify(vault))
  localStorage.removeItem(MNEMONIC_STORAGE_KEY)
  localStorage.removeItem(NSEC_STORAGE_KEY)
}

export const decryptMnemonicWithPrf = async (vault: PrfVault, prfOutput: Uint8Array): Promise<string> => {
  const combined = new Uint8Array(
    atob(vault.data)
      .split('')
      .map((c) => c.charCodeAt(0)),
  )

  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encrypted = combined.slice(28)

  const key = await deriveAesKeyFromPrf(prfOutput, salt, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}

/** Asserts the vault's passkey (biometric prompt) and decrypts the mnemonic. */
export const getMnemonicWithPasskey = async (): Promise<string> => {
  const vault = getPrfVault()
  if (!vault) throw new Error('No passkey-encrypted mnemonic found')
  const prfOutput = await assertPrf(vault.credentialId)
  try {
    return await decryptMnemonicWithPrf(vault, prfOutput)
  } finally {
    prfOutput.fill(0)
  }
}

export const clearPrfMnemonic = (): void => {
  localStorage.removeItem(PRF_MNEMONIC_STORAGE_KEY)
}

const deriveAesKeyFromPrf = async (prfOutput: Uint8Array, salt: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey('raw', prfOutput as Uint8Array<ArrayBuffer>, 'HKDF', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as Uint8Array<ArrayBuffer>,
      info: HKDF_INFO as Uint8Array<ArrayBuffer>,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  )
}
