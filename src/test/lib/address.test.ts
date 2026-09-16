import { describe, expect, it } from 'vitest'
import {
  decodeArkAddress,
  isBTCAddress,
  isEmailAddress,
  isLightningInvoice,
  isURLWithLightningQueryString,
} from '../../lib/address'
import fixtures from '../fixtures.json'
import { isValidLnUrl } from '../../lib/lnurl'
import { isValidArkAddress } from '@arkade-os/sdk'

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

  // guards the SDK validator against the wallet's own address fixtures
  describe('isValidArkAddress', () => {
    it('should return true for a valid address', () => {
      expect(isValidArkAddress(fixtures.lib.address.ark[0].address)).toBe(true)
    })

    it('should return false for an invalid address', () => {
      expect(isValidArkAddress('invalidAddress')).toBe(false)
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

  // The whole behavioural difference from the regex `isBTCAddress` replaced.
  describe('isBTCAddress: SDK predicate plus a decode gate', () => {
    it('accepts testnet/regtest legacy addresses the old regex rejected', () => {
      expect(isBTCAddress('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn')).toBe(true)
      expect(isBTCAddress('2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc')).toBe(true)
    })

    it('rejects mixed-case bech32, which BIP173 forbids and the old regex allowed', () => {
      expect(isBTCAddress('bc1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8f3t4')).toBe(false)
    })

    it('rejects a bech32 no L1 can decode, which the SDK predicate alone accepts', () => {
      // `isBtcAddress` is format-only by design; the decode gate is what keeps
      // an unspendable address out of the form rather than out of the signature.
      expect(isBTCAddress('bc1qqqqqqqq')).toBe(false)
      expect(isBTCAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5')).toBe(false)
    })

    it('still accepts the address forms the wallet already sent to', () => {
      expect(isBTCAddress('bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7')).toBe(true)
      expect(isBTCAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(true)
      expect(isBTCAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBe(true)
      expect(isBTCAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true)
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
