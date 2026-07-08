import { describe, expect, it, beforeEach } from 'vitest'
import {
  hasPrfMnemonic,
  getPrfVault,
  setMnemonicWithPrf,
  decryptMnemonicWithPrf,
  clearPrfMnemonic,
} from '../../lib/passkeyVault'
import { setMnemonic, hasMnemonic } from '../../lib/mnemonic'
import { setPrivateKey } from '../../lib/privateKey'
import { MNEMONIC_STORAGE_KEY, NSEC_STORAGE_KEY, PRF_MNEMONIC_STORAGE_KEY } from '../../lib/storageKeys'

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const credentialId = 'deadbeef'
const prfOutput = () => new Uint8Array(32).fill(7)
const wrongPrfOutput = () => new Uint8Array(32).fill(8)

describe('passkey vault', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('hasPrfMnemonic / getPrfVault', () => {
    it('should return false/null when nothing is stored', () => {
      expect(hasPrfMnemonic()).toBe(false)
      expect(getPrfVault()).toBeNull()
    })

    it('should return the vault after storing', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      expect(hasPrfMnemonic()).toBe(true)
      const vault = getPrfVault()
      expect(vault?.v).toBe(1)
      expect(vault?.credentialId).toBe(credentialId)
      expect(typeof vault?.data).toBe('string')
    })

    it('should return null for malformed vaults', () => {
      localStorage.setItem(PRF_MNEMONIC_STORAGE_KEY, 'not json')
      expect(getPrfVault()).toBeNull()
      localStorage.setItem(PRF_MNEMONIC_STORAGE_KEY, JSON.stringify({ v: 2, data: 'x' }))
      expect(getPrfVault()).toBeNull()
    })
  })

  describe('encrypt / decrypt round trip', () => {
    it('should decrypt with the same PRF output', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      const vault = getPrfVault()
      expect(vault).not.toBeNull()
      const decrypted = await decryptMnemonicWithPrf(vault!, prfOutput())
      expect(decrypted).toBe(testMnemonic)
    })

    it('should fail with a different PRF output', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      const vault = getPrfVault()
      await expect(decryptMnemonicWithPrf(vault!, wrongPrfOutput())).rejects.toThrow()
    })

    it('should store the envelope as base64(salt||iv||ciphertext)', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      const vault = getPrfVault()
      const combined = new Uint8Array(
        atob(vault!.data)
          .split('')
          .map((c) => c.charCodeAt(0)),
      )
      // 16B salt + 12B iv + ciphertext (plaintext + 16B GCM tag)
      expect(combined.length).toBe(16 + 12 + testMnemonic.length + 16)
    })
  })

  describe('mutual exclusion of storage keys', () => {
    it('setMnemonicWithPrf removes password-encrypted secrets', async () => {
      localStorage.setItem(MNEMONIC_STORAGE_KEY, 'x')
      localStorage.setItem(NSEC_STORAGE_KEY, 'y')
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
      expect(localStorage.getItem(NSEC_STORAGE_KEY)).toBeNull()
      expect(hasPrfMnemonic()).toBe(true)
    })

    it('setMnemonic removes the PRF vault', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      await setMnemonic(testMnemonic, 'password')
      expect(hasPrfMnemonic()).toBe(false)
      expect(hasMnemonic()).toBe(true)
    })

    it('setPrivateKey removes the PRF vault', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      await setPrivateKey(new Uint8Array(32).fill(1), 'password')
      expect(hasPrfMnemonic()).toBe(false)
    })
  })

  describe('clearPrfMnemonic', () => {
    it('should remove the vault', async () => {
      await setMnemonicWithPrf(testMnemonic, credentialId, prfOutput())
      clearPrfMnemonic()
      expect(hasPrfMnemonic()).toBe(false)
    })
  })
})
