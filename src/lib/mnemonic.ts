import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { getSecretStore } from './secretStore'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY } from './storageKeys'

// Secret persistence is routed through the runtime secret store (localStorage on
// PWA, native secure storage on Capacitor — see src/lib/secretStore.ts). Native
// secure storage reads are async, so `hasMnemonic` is async too.
export const hasMnemonic = async (): Promise<boolean> => {
  return (await getSecretStore().getItem(MNEMONIC_STORAGE_KEY)) !== null
}

export const setMnemonic = async (mnemonic: string, password: string): Promise<void> => {
  const encrypted = await encryptMnemonic(mnemonic, password)
  await getSecretStore().setItem(MNEMONIC_STORAGE_KEY, encrypted)
  await getSecretStore().removeItem(NSEC_STORAGE_KEY)
}

export const getMnemonic = async (password: string): Promise<string> => {
  const encrypted = await getSecretStore().getItem(MNEMONIC_STORAGE_KEY)
  if (!encrypted) throw new Error('No encrypted mnemonic found')
  return decryptMnemonic(encrypted, password)
}

/**
 * Derives a 32-byte private key from a mnemonic using BIP86 Taproot path.
 * Used for Nostr backup operations (NIP-44 encryption needs raw seckey).
 * Note: this path (m/86'/coinType'/0'/0/0) matches MnemonicIdentity — the Nostr
 * backup key IS the wallet signing key, a deliberate tradeoff matching legacy
 * raw-privkey behavior where the same key served both purposes.
 */
export const deriveNostrKeyFromMnemonic = (mnemonic: string, isMainnet: boolean): Uint8Array => {
  if (!validateMnemonic(mnemonic, wordlist)) {
    throw new Error('Invalid mnemonic phrase')
  }
  const seed = mnemonicToSeedSync(mnemonic)
  const masterNode = HDKey.fromMasterSeed(seed)
  const coinType = isMainnet ? 0 : 1
  const derived = masterNode.derive(`m/86'/${coinType}'/0'`).deriveChild(0).deriveChild(0)
  if (!derived.privateKey) throw new Error('BIP32 derivation yielded no private key')
  return derived.privateKey
}

const encryptMnemonic = async (mnemonic: string, password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])

  const salt = crypto.getRandomValues(new Uint8Array(16))

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(mnemonic))

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

const decryptMnemonic = async (encryptedMnemonic: string, password: string): Promise<string> => {
  const combined = new Uint8Array(
    atob(encryptedMnemonic)
      .split('')
      .map((c) => c.charCodeAt(0)),
  )

  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encrypted = combined.slice(28)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}
