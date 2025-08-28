import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures.json'
import { decodeBip21, encodeBip21 } from '../../lib/bip21'

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
})
