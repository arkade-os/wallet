import { beforeEach, describe, expect, it } from 'vitest'
import {
  getPrivateKey,
  invalidPrivateKey,
  nsecToPrivateKey,
  privateKeyToNsec,
  setPrivateKey,
} from '../../lib/privateKey'
import fixtures from '../fixtures.json'
import { hex } from '@scure/base'
import { MNEMONIC_STORAGE_KEY } from '@/lib/storageKeys'

describe('privatekey utilities', () => {
  const npub = fixtures.lib.privatekey.public.npub
  const nsec = fixtures.lib.privatekey.secret.nsec
  const hexs = fixtures.lib.privatekey.secret.hex

  describe('invalidPrivateKey', () => {
    it('should return error on invalid length', () => {
      expect(invalidPrivateKey(Uint8Array.from([1]))).toBe('restore.invalidLengthPrivateKey')
    })

    it('should return empty on empty private key', () => {
      expect(invalidPrivateKey(Uint8Array.from([]))).toBe('')
    })

    it('should return empty on valid private key', () => {
      expect(invalidPrivateKey(Uint8Array.from(Array(32).fill('1')))).toBe('')
    })
  })

  describe('nsecToPrivateKey', () => {
    it('should return private key from nsec', () => {
      expect(nsecToPrivateKey(nsec)).toEqual(hex.decode(hexs))
    })

    it('should throw on invalid nsec', () => {
      const nsec2 = nsec.substring(0, nsec.length - 1) + '1'
      expect(() => nsecToPrivateKey(nsec2)).toThrow()
    })

    it('should throw on npub', () => {
      expect(() => nsecToPrivateKey(npub)).toThrow()
    })
  })

  describe('privateKeyToNsec', () => {
    it('should return nsec from private key', () => {
      expect(privateKeyToNsec(hex.decode(hexs))).toEqual(nsec)
    })

    it('should throw on invalid private key', () => {
      expect(() => privateKeyToNsec(Uint8Array.from([1]))).toThrow('restore.invalidPrivateKey')
    })
  })

  describe('setPrivateKey / getPrivateKey', () => {
    const bytesKey = nsecToPrivateKey(fixtures.lib.privatekey.secret.nsec)
    const mnemonic = 'abandon '.repeat(11) + 'about'
    const password = 'password'

    beforeEach(() => {
      localStorage.clear()
    })

    it('should encrypt, store, and decrypt a private key', async () => {
      await setPrivateKey(bytesKey, password)
      const result = await getPrivateKey(password)
      expect(result).toStrictEqual(bytesKey)
    })

    it('should throw on wrong password', async () => {
      await setPrivateKey(bytesKey, password)
      await expect(getPrivateKey('wrongpassword')).rejects.toThrow()
    })

    it('should throw when no private key is stored', async () => {
      await expect(getPrivateKey(password)).rejects.toThrow('restore.noEncryptedPrivateKey')
    })

    it('should remove mnemonic when setting a new private key', async () => {
      localStorage.setItem(MNEMONIC_STORAGE_KEY, mnemonic)
      expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBe(mnemonic)
      await setPrivateKey(bytesKey, password)
      expect(localStorage.getItem(MNEMONIC_STORAGE_KEY)).toBeNull()
    })
  })
})
