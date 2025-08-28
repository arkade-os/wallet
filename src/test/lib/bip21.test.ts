import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures.json'
import { decodeBip21, encodeBip21 } from '../../lib/bip21'
import { toSatoshis } from '../../lib/format'

describe('bip21 utilities', () => {
  describe('decodeBip21', () => {
    it('should decode a valid bip21 URI', () => {
      const { address, bip21, arkAddress, invoice, satoshis } = fixtures.lib.bip21
      expect(decodeBip21(bip21)).toEqual({ arkAddress, address, invoice, satoshis, lnurl: undefined })
    })

    it('should throw an error for an invalid address', () => {
      expect(() => decodeBip21('invalidBip21')).toThrow('Invalid BIP21 URI')
    })
  })

  describe('encodeBip21', () => {
    it('should encode a valid bip21 URI', () => {
      const { address, bip21, arkAddress, invoice, satoshis } = fixtures.lib.bip21
      expect(encodeBip21(address, arkAddress, invoice, satoshis)).toEqual(bip21)
    })
  })

  describe('bip21.js tests', () => {
    const output = {
      address: undefined,
      invoice: undefined,
      lnurl: undefined,
      satoshis: undefined,
    }

    it('should pass all valid tests from bip21.js', () => {
      const tests = fixtures.lib.bip21.valid
      tests.forEach(({ address, compliant, options, uri }) => {
        if (compliant !== false) {
          if (typeof options?.amount !== 'undefined') {
            const satoshis = toSatoshis(Number(options?.amount))
            expect(decodeBip21(uri)).toEqual({ ...output, address, satoshis })
          } else {
            expect(decodeBip21(uri)).toEqual({ ...output, address })
          }
        }
      })
    })

    it('should throw on every invalid test', () => {
      const tests = fixtures.lib.bip21.invalid
      tests.forEach(({ exception, uri }) => {
        if (!uri) return
        expect(() => decodeBip21(uri)).toThrow(exception)
      })
    })
  })
})
