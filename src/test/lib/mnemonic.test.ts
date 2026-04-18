import { describe, expect, it, beforeEach } from 'vitest'
import { setMnemonic, getMnemonic, hasMnemonic, deriveNostrKeyFromMnemonic } from '../../lib/mnemonic'

const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const testPassword = 'testpassword'

describe('mnemonic storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('hasMnemonic', () => {
    it('should return false when no mnemonic is stored', () => {
      expect(hasMnemonic()).toBe(false)
    })

    it('should return true after storing a mnemonic', async () => {
      await setMnemonic(testMnemonic, testPassword)
      expect(hasMnemonic()).toBe(true)
    })
  })

  describe('setMnemonic / getMnemonic', () => {
    it('should encrypt, store, and decrypt a mnemonic', async () => {
      await setMnemonic(testMnemonic, testPassword)
      const result = await getMnemonic(testPassword)
      expect(result).toBe(testMnemonic)
    })

    it('should throw on wrong password', async () => {
      await setMnemonic(testMnemonic, testPassword)
      await expect(getMnemonic('wrongpassword')).rejects.toThrow()
    })

    it('should throw when no mnemonic is stored', async () => {
      await expect(getMnemonic(testPassword)).rejects.toThrow('No encrypted mnemonic found')
    })
  })

  describe('deriveNostrKeyFromMnemonic', () => {
    it('should return a 32-byte key', () => {
      const key = deriveNostrKeyFromMnemonic(testMnemonic, false)
      expect(key).toBeInstanceOf(Uint8Array)
      expect(key.length).toBe(32)
    })

    it('should be deterministic', () => {
      const key1 = deriveNostrKeyFromMnemonic(testMnemonic, false)
      const key2 = deriveNostrKeyFromMnemonic(testMnemonic, false)
      expect(key1).toEqual(key2)
    })

    it('should produce different keys for mainnet vs testnet', () => {
      const mainnet = deriveNostrKeyFromMnemonic(testMnemonic, true)
      const testnet = deriveNostrKeyFromMnemonic(testMnemonic, false)
      expect(mainnet).not.toEqual(testnet)
    })
  })
})
