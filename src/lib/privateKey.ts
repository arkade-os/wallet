import { getPublicKey, nip19 } from 'nostr-tools'
import { defaultPassword } from './constants'

const STORAGE_KEY = 'encrypted_private_key'

export const invalidPrivateKey = (key: Uint8Array): string => {
  if (key.length === 0) return ''
  if (key.length !== 32) return 'Invalid length: private key must be 32 bytes'
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

export const nsecToPrivateKey = (nsec: string): Uint8Array => {
  const { type, data } = nip19.decode(nsec)
  if (type !== 'nsec') throw 'Invalid nsec format'
  return data
}

export const privateKeyToNsec = (privateKey: Uint8Array): string => {
  return nip19.nsecEncode(privateKey)
}

export const privateKeyToNpub = (privateKey: Uint8Array): string => {
  return nip19.npubEncode(getPublicKey(privateKey))
}

export const getPrivateKey = async (password: string): Promise<Uint8Array> => {
  const encryptedPrivateKey = getEncryptedPrivateKey()
  if (!encryptedPrivateKey) throw new Error('No encrypted private key found')
  return decryptPrivateKey(encryptedPrivateKey, password)
}

export const setPrivateKey = async (privateKey: Uint8Array, password: string): Promise<void> => {
  try {
    const encryptedPrivateKey = await encryptPrivateKey(privateKey, password)
    storeEncryptedPrivateKey(encryptedPrivateKey)
  } catch (error) {
    console.error('Failed to encrypt and store private key:', error)
    throw new Error('Failed to set private key')
  }
}

export const isValidPassword = async (password: string): Promise<boolean> => {
  try {
    await getPrivateKey(password)
    return true
  } catch {
    return false
  }
}

export const noUserDefinedPassword = async (): Promise<boolean> => {
  return await isValidPassword(defaultPassword)
}

const storeEncryptedPrivateKey = (encryptedPrivateKey: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY, encryptedPrivateKey)
  } catch (error) {
    console.error('Failed to store encrypted private key:', error)
    throw new Error('Failed to store encrypted private key')
  }
}

const getEncryptedPrivateKey = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to retrieve encrypted private key:', error)
    return null
  }
}

const encryptPrivateKey = async (privateKey: Uint8Array, password: string): Promise<string> => {
  // Convert password to key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // Derive key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  )

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    privateKey as Uint8Array<ArrayBuffer>,
  )

  // Combine salt, IV, and encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  // Convert to base64
  return btoa(String.fromCharCode(...combined))
}

const decryptPrivateKey = async (encryptedPrivateKey: string, password: string): Promise<Uint8Array> => {
  // Convert base64 to Uint8Array
  const combined = new Uint8Array(
    atob(encryptedPrivateKey)
      .split('')
      .map((c) => c.charCodeAt(0)),
  )

  // Extract salt, IV, and encrypted data
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const encrypted = combined.slice(28)

  // Convert password to key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])

  // Derive key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  )

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encrypted,
  )

  return new Uint8Array(decrypted)
}
