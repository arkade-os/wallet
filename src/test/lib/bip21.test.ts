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

    it('should decode a valid bip21 URI with uppercase', () => {
      const bip21 =
        'BITCOIN:?ARK=ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D&LIGHTNING=LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U'
      const { address, arkAddress, invoice, lnurl, satoshis } = decodeBip21(bip21)
      expect(address).toBeUndefined()
      expect(arkAddress).toBe(
        'ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D',
      )
      expect(invoice).toBeUndefined()
      expect(lnurl).toBe(
        'LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U',
      )
      expect(satoshis).toBeUndefined()
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
    it('should pass all valid tests', () => {
      const tests = fixtures.lib.bip21.valid
      tests.forEach(({ address, compliant, options, uri, urnScheme }) => {
        if (compliant !== false && !urnScheme) {
          if (typeof options?.amount !== 'undefined') {
            const satoshis = toSatoshis(Number(options?.amount))
            expect(decodeBip21(uri)).toMatchObject({ address, satoshis })
          } else {
            expect(decodeBip21(uri)).toMatchObject({ address })
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
