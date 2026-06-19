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
import { isValidLnUrl } from '../../lib/lnurl'

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
    for (const test of fixtures.lib.address.btc) {
      expect(isBTCAddress(test)).toBe(true)
    }

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

    it('should return false for an invalid lightning query string', () => {
      const url = 'http://example.com?lightning=invalidInvoice'
      expect(isURLWithLightningQueryString(url)).toBe(false)
    })

    it('should return false for an empty lightning query string', () => {
      const url = 'http://example.com?lightning='
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

  describe('isValidLnUrl', () => {
    const lnurl =
      'LNURL1DP68GUP69UHKCMMRV9KXSMMNWSARJV' +
      'PEXQHKCMN4WFKZ7DPEX93NWEF4XVUNVDMRXG' +
      'MN2VFKXQMRJEP4XF3K2D33XEJN2EFSG25472'

    it('should return true for a valid email address', () => {
      expect(isValidLnUrl('test@example.com')).toBe(true)
    })

    it('should return false for an invalid email address', () => {
      expect(isValidLnUrl('invalidEmail')).toBe(false)
    })

    it('should return true for a valid lnurl', () => {
      expect(isValidLnUrl(lnurl.toLowerCase())).toBe(true)
      expect(isValidLnUrl(lnurl)).toBe(true)
    })

    it('should return false for an invalid lnurl', () => {
      expect(isValidLnUrl('invalidLnurl')).toBe(false)
    })

    it('should return false for a mix cased lnurl', () => {
      const mixedCaseLnurl = lnurl.replace('LNURL', 'LnUrL')
      expect(isValidLnUrl(mixedCaseLnurl)).toBe(false)
    })
  })
})
