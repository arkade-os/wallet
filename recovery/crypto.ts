import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { hex } from '@scure/base'
import { getPublicKey } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'

export interface RecoveredKeys {
  privateKeyHex: string
  publicKeyHex: string
  nsec: string
  npub: string
}

export const isValidMnemonic = (mnemonic: string): boolean => validateMnemonic(mnemonic.trim(), wordlist)

/**
 * Derives the Arkade wallet key from a mnemonic. Must match the app exactly:
 * BIP86 taproot path m/86'/{0|1}'/0'/0/0 (see src/lib/mnemonic.ts —
 * deriveNostrKeyFromMnemonic / MnemonicIdentity).
 */
export const recoverKeys = (mnemonic: string, isMainnet: boolean): RecoveredKeys => {
  const trimmed = mnemonic.trim().toLowerCase().split(/\s+/).join(' ')
  if (!validateMnemonic(trimmed, wordlist)) throw new Error('Invalid recovery phrase')
  const seed = mnemonicToSeedSync(trimmed)
  const masterNode = HDKey.fromMasterSeed(seed)
  const coinType = isMainnet ? 0 : 1
  const derived = masterNode.derive(`m/86'/${coinType}'/0'`).deriveChild(0).deriveChild(0)
  if (!derived.privateKey) throw new Error('BIP32 derivation yielded no private key')
  return keysFromPrivateKey(derived.privateKey)
}

export const keysFromPrivateKey = (privateKey: Uint8Array): RecoveredKeys => {
  if (privateKey.length !== 32) throw new Error('Private key must be 32 bytes')
  const publicKey = getPublicKey(privateKey)
  return {
    privateKeyHex: hex.encode(privateKey),
    publicKeyHex: publicKey,
    nsec: nip19.nsecEncode(privateKey),
    npub: nip19.npubEncode(publicKey),
  }
}

export type DecryptedBackup = { kind: 'mnemonic'; mnemonic: string } | { kind: 'privateKey'; privateKey: Uint8Array }

/**
 * Decrypts an encrypted wallet backup blob copied from the app's storage
 * (localStorage keys `encrypted_mnemonic` / `encrypted_private_key`).
 * Format: base64 of salt(16) || iv(12) || AES-GCM ciphertext, key derived
 * with PBKDF2-SHA-256 (100k iterations) — must match src/lib/mnemonic.ts.
 * Passkey (PRF) vaults cannot be decrypted offline; use the 12 words instead.
 */
export const decryptBackup = async (encryptedBase64: string, password: string): Promise<DecryptedBackup> => {
  if (!globalThis.crypto?.subtle) throw new Error('WebCrypto unavailable: open this file in a modern browser')

  let combined: Uint8Array
  try {
    combined = new Uint8Array(
      atob(encryptedBase64.trim())
        .split('')
        .map((c) => c.charCodeAt(0)),
    )
  } catch {
    throw new Error('Invalid backup: not valid base64')
  }
  if (combined.length <= 28) throw new Error('Invalid backup: too short')

  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encrypted = combined.slice(28)

  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as Uint8Array<ArrayBuffer>, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )

  let decrypted: ArrayBuffer
  try {
    decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as Uint8Array<ArrayBuffer> },
      key,
      encrypted as Uint8Array<ArrayBuffer>,
    )
  } catch {
    throw new Error('Decryption failed: wrong password or corrupted backup')
  }

  const bytes = new Uint8Array(decrypted)
  const text = new TextDecoder().decode(bytes)
  if (isValidMnemonic(text)) return { kind: 'mnemonic', mnemonic: text.trim() }
  if (bytes.length === 32) return { kind: 'privateKey', privateKey: bytes }
  throw new Error('Decrypted data is neither a recovery phrase nor a private key')
}
