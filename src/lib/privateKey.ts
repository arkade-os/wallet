import { getPublicKey, nip19 } from 'nostr-tools'
import { hex } from '@scure/base'

const STORAGE_KEY = 'encrypted_private_key'

export const invalidPrivateKey = (key: string): string => {
  if (key.length === 0) return ''
  if (key.length !== 64) return 'Invalid length: private key must be 64 characters'
  if (!/^[0-9A-Fa-f]+$/.test(key)) return 'Unable to validate private key format: must be hexadecimal'
  return ''
}

export const invalidNpub = (npub: string): string => {
  if (!npub) return 'Please enter a npub'
  if (!/^npub/.test(npub)) return 'Invalid prefix: must start with npub'
  if (npub.length !== 63) return 'Invalid length: npub must be 63 characters'
  try {
    nip19.decode(npub)
  } catch {
    return 'Unable to validate npub format'
  }
  return ''
}

export const nsecToSeed = (nsec: string): string => {
  const { type, data } = nip19.decode(nsec)
  if (type !== 'nsec') throw 'Invalid nsec format'
  return hex.encode(data)
}

export const seedToNsec = (seed: string | Uint8Array): string => {
  const sk = typeof seed === 'string' ? hex.decode(seed) : seed
  return nip19.nsecEncode(sk)
}

export const seedToNpub = (seed: string | Uint8Array): string => {
  const sk = typeof seed === 'string' ? hex.decode(seed) : seed
  return nip19.npubEncode(getPublicKey(sk))
}

export const getSeed = async (password: string): Promise<Uint8Array | null> => {
  const encryptedKey = getEncryptedKey()
  if (!encryptedKey) return null
  
  try {
    return decryptPrivateKey(encryptedKey, password)
  } catch (error) {
    console.error('Failed to decrypt seed:', error)
    return null
  }
}

export const setSeed = async (seed: string | Uint8Array, password: string): Promise<void> => {
  try {
    const seedHex = typeof seed === 'string' ? seed : hex.encode(seed)
    const encryptedKey = await encryptPrivateKey(seedHex, password)
    storeEncryptedKey(encryptedKey)
  } catch (error) {
    console.error('Failed to encrypt and store seed:', error)
    throw new Error('Failed to encrypt and store seed')
  }
}

const storeEncryptedKey = (encryptedKey: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, encryptedKey)
  } catch (error) {
    console.error('Failed to store encrypted key:', error)
    throw new Error('Failed to store encrypted key')
  }
}

const getEncryptedKey = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to retrieve encrypted key:', error)
    return null
  }
}

const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  // Convert password to key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Derive key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encoder.encode(privateKey)
  )

  // Combine salt, IV, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  // Convert to base64
  return btoa(String.fromCharCode(...combined))
}

const decryptPrivateKey = async (encryptedKey: string, password: string): Promise<Uint8Array> => {
  // Convert base64 to Uint8Array
  const combined = new Uint8Array(
    atob(encryptedKey).split('').map(c => c.charCodeAt(0))
  )

  // Extract salt, IV, and encrypted data
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encrypted = combined.slice(28)

  // Convert password to key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Derive key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encrypted
  )

  return new Uint8Array(decrypted)
}
