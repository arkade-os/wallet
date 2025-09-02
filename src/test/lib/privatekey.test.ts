import { describe, expect, it } from 'vitest'
import {
  invalidNpub,
  invalidPrivateKey,
  nsecToPrivateKey,
  privateKeyToNpub,
  privateKeyToNsec,
} from '../../lib/privateKey'
import fixtures from '../fixtures.json'
import { hex } from '@scure/base'

describe('privatekey utilities', () => {
  const npub = fixtures.lib.privatekey.public.npub
  const nsec = fixtures.lib.privatekey.secret.nsec
  const hexs = fixtures.lib.privatekey.secret.hex

  describe('invalidPrivateKey', () => {
    it('should return error on invalid length', () => {
      expect(invalidPrivateKey(Uint8Array.from([1]))).toBe('Invalid length: private key must be 32 bytes')
    })

    it('should return empty on empty private key', () => {
      expect(invalidPrivateKey(Uint8Array.from([]))).toBe('')
    })

    it('should return empty on valid private key', () => {
      expect(invalidPrivateKey(Uint8Array.from(Array(32).fill('1')))).toBe('')
    })
  })

  describe('invalidNpub', () => {
    it('should return empty on valid npub', () => {
      expect(invalidNpub(npub)).toBe('')
    })

    it('should return error on empty npub', () => {
      expect(invalidNpub('')).toBe('Please enter a npub')
    })

    it('should return error on invalid prefix', () => {
      expect(invalidNpub('xxx')).toBe('Invalid prefix: must start with npub')
    })

    it('should return error on invalid length', () => {
      expect(invalidNpub('npub')).toBe('Invalid length: npub must be 63 characters')
    })

    it('should return error on invalid format', () => {
      const npub2 = npub.substring(0, npub.length - 1) + '1'
      expect(invalidNpub(npub2)).toBe('Unable to validate npub format')
    })
  })

  describe('nsecToPrivateKey', () => {
    it('should return private key from nsec', () => {
      expect(nsecToPrivateKey(nsec)).toEqual(hex.decode(hexs))
    })

    it('should throw on invalid prefix', () => {
      expect(() => nsecToPrivateKey(npub)).toThrow('Invalid nsec format')
    })

    it('should throw on invalid nsec', () => {
      const nsec2 = nsec.substring(0, nsec.length - 1) + '1'
      expect(() => nsecToPrivateKey(nsec2)).toThrow()
    })
  })

  describe('privateKeyToNsec', () => {
    it('should return nsec from private key', () => {
      expect(privateKeyToNsec(hex.decode(hexs))).toEqual(nsec)
    })

    it('should throw on invalid private key', () => {
      expect(() => privateKeyToNsec(Uint8Array.from([1]))).toThrow('Invalid private key')
    })
  })

  describe('privateKeyToNpub', () => {
    it('should return npub from private key', () => {
      expect(privateKeyToNpub(hex.decode(hexs))).toEqual(npub)
    })

    it('should throw on invalid private key', () => {
      expect(() => privateKeyToNpub(Uint8Array.from([1]))).toThrow('Invalid private key')
    })
  })
})
