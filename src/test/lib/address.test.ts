import { describe, expect, it } from 'vitest'
import {
  decodeArkAddress,
  isArkAddress,
  isBTCAddress,
  isEmailAddress,
  isLightningInvoice,
  isURLWithLightningQueryString,
} from '../../lib/address'
import fixtures from '../fixtures.json'

describe('address utilities', () => {
  describe('decodeAddress', () => {
    it('should decode valid addresses', () => {
      fixtures.lib.address.ark.forEach(({ address, vtxoTaprootKey, serverPubKey }) => {
        expect(decodeArkAddress(address)).toEqual({ vtxoTaprootKey, serverPubKey })
      })
    })

    it('should throw an error for an invalid address', () => {
      expect(() => decodeArkAddress('invalidAddress')).toThrow('Invalid address')
    })
  })

  describe('isArkAddress', () => {
    it('should return true for a valid address', () => {
      expect(isArkAddress(fixtures.lib.address.ark[0].address)).toBe(true)
    })

    it('should return false for an invalid address', () => {
      expect(isArkAddress('invalidAddress')).toBe(false)
    })
  })

  describe('isBtcAddress', () => {
    it('should return true for a valid address', () => {
      expect(isBTCAddress(fixtures.lib.address.btc.address)).toBe(true)
    })

    it('should return false for an invalid address', () => {
      expect(isBTCAddress('invalidAddress')).toBe(false)
    })
  })

  describe('isLightningInvoice', () => {
    it('should return true for a valid invoice', () => {
      expect(isLightningInvoice(fixtures.lib.bolt11.invoice)).toBe(true)
    })

    it('should return false for an invalid invoice', () => {
      expect(isLightningInvoice('invalidInvoice')).toBe(false)
    })
  })

  describe('isURLWithLightningQueryString', () => {
    it('should return true for a valid URL with lightning query string', () => {
      const url = `http://example.com?lightning=${fixtures.lib.bolt11.invoice}`
      expect(isURLWithLightningQueryString(url)).toBe(true)
    })

    it('should return false for a URL without lightning query string', () => {
      const url = 'http://example.com'
      expect(isURLWithLightningQueryString(url)).toBe(false)
    })

    it('should return false for an invalid URL', () => {
      const url = 'invalidURL'
      expect(isURLWithLightningQueryString(url)).toBe(false)
    })
  })

  describe('isEmailAddress', () => {
    it('should return true for a valid email address', () => {
      expect(isEmailAddress('test@example.com')).toBe(true)
    })

    it('should return false for an invalid email address', () => {
      expect(isEmailAddress('invalidEmail')).toBe(false)
    })
  })
})
