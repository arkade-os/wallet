import { entropyToMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { assertPrf } from './passkey'
import {
  MNEMONIC_STORAGE_KEY,
  NSEC_STORAGE_KEY,
  PASSKEY_WALLET_STORAGE_KEY,
  PRF_MNEMONIC_STORAGE_KEY,
} from './storageKeys'

/**
 * Passkey-derived wallet (FileKey model): the passkey's PRF output IS the root
 * of the wallet. Asserting the passkey yields a deterministic 32-byte secret;
 * HKDF-SHA-256 whitens it into 128 bits of BIP39 entropy → a 12-word mnemonic.
 * The same passkey always reproduces the same mnemonic, so nothing secret is
 * stored at rest — only a descriptor naming which credential to assert. The
 * 12 words are that same seed encoded, and restore the wallet WITHOUT the
 * passkey in any BIP39 wallet (the backup for a lost/deleted passkey).
 */
export type PasskeyDescriptor = { v: 1; credentialId: string }

// Domain-separation label folded into HKDF; part of the derivation, never change it.
const SEED_HKDF_INFO = new TextEncoder().encode('arkade-wallet/seed/v1')
const MNEMONIC_ENTROPY_BYTES = 16 // 128-bit → 12-word BIP39 mnemonic

/** Deterministically derives the wallet's 12-word mnemonic from a PRF output. */
export const mnemonicFromPrf = async (prfOutput: Uint8Array): Promise<string> => {
  const keyMaterial = await crypto.subtle.importKey('raw', prfOutput as Uint8Array<ArrayBuffer>, 'HKDF', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: SEED_HKDF_INFO as Uint8Array<ArrayBuffer> },
    keyMaterial,
    MNEMONIC_ENTROPY_BYTES * 8,
  )
  const entropy = new Uint8Array(bits)
  try {
    return entropyToMnemonic(entropy, wordlist)
  } finally {
    entropy.fill(0)
  }
}

export const hasPasskeyWallet = (): boolean => {
  return localStorage.getItem(PASSKEY_WALLET_STORAGE_KEY) !== null
}

export const getPasskeyDescriptor = (): PasskeyDescriptor | null => {
  const raw = localStorage.getItem(PASSKEY_WALLET_STORAGE_KEY)
  if (!raw) return null
  try {
    const desc = JSON.parse(raw)
    if (desc?.v !== 1 || typeof desc.credentialId !== 'string') return null
    return desc as PasskeyDescriptor
  } catch {
    return null
  }
}

/** Records that this wallet is unlocked by a passkey; stores no secret. */
export const setPasskeyWallet = (credentialId: string): void => {
  const descriptor: PasskeyDescriptor = { v: 1, credentialId }
  localStorage.setItem(PASSKEY_WALLET_STORAGE_KEY, JSON.stringify(descriptor))
  // this wallet's secret is the passkey — drop any password/private-key vaults
  localStorage.removeItem(MNEMONIC_STORAGE_KEY)
  localStorage.removeItem(NSEC_STORAGE_KEY)
  localStorage.removeItem(PRF_MNEMONIC_STORAGE_KEY)
}

export const clearPasskeyWallet = (): void => {
  localStorage.removeItem(PASSKEY_WALLET_STORAGE_KEY)
}

/** Asserts the wallet's passkey (biometric prompt) and derives the mnemonic. */
export const getMnemonicWithPasskey = async (): Promise<string> => {
  const descriptor = getPasskeyDescriptor()
  if (!descriptor) throw new Error('No passkey wallet found')
  const prfOutput = await assertPrf(descriptor.credentialId)
  try {
    return await mnemonicFromPrf(prfOutput)
  } finally {
    prfOutput.fill(0)
  }
}
