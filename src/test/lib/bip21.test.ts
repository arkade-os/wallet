import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures.json'
import { Bip21Taxi, decodeBip21, encodeBip21, encodeBip21Asset } from '../../lib/bip21'
import { toSatoshis } from '../../lib/format'

const ARK = 'ark1qtaxitest'
const ASSET = 'testasset'
const KEY = 'a'.repeat(64)

describe('bip21 utilities', () => {
  describe('decodeBip21', () => {
    it('should decode a valid bip21 URI', () => {
      const { address, bip21, arkAddress, invoice, satoshis } = fixtures.lib.bip21
      expect(decodeBip21(bip21)).toEqual({ arkAddress, address, invoice, satoshis, lnUrl: undefined })
    })

    it('should decode a valid bip21 URI with uppercase', () => {
      const bip21 =
        'BITCOIN:?ARK=ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D&LIGHTNING=LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U'
      const { address, arkAddress, invoice, lnUrl, satoshis } = decodeBip21(bip21)
      expect(address).toBeUndefined()
      expect(arkAddress).toBe(
        'ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D',
      )
      expect(invoice).toBeUndefined()
      expect(lnUrl).toBe(
        'LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U',
      )
      expect(satoshis).toBeUndefined()
    })

    it('should decode a valid bip21 without ark address', () => {
      const bip21 =
        'BITCOIN:bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh?LIGHTNING=LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U'
      const { address, arkAddress, invoice, lnUrl, satoshis } = decodeBip21(bip21)
      expect(address).toBe('bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh')
      expect(arkAddress).toBeUndefined()
      expect(invoice).toBeUndefined()
      expect(lnUrl).toBe(
        'LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U',
      )
      expect(satoshis).toBeUndefined()
    })

    it('should decode mixed-case query parameter keys', () => {
      const bip21 =
        'bitcoin:?Ark=ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D&Lightning=LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U'
      const { arkAddress, lnUrl } = decodeBip21(bip21)
      expect(arkAddress).toBe(
        'ARK1QQ4HFSSPRTCGNJZF8QLW2F78YVJAU5KLDFUGG29K34Y7J96Q2W4T4USH2JZ072D0ALD83VLWZRKDG24R40WRCM8XJW6AX7YPNJHTEZGU4A9R8D',
      )
      expect(lnUrl).toBe(
        'LNURL1DP68GURN8GHJ7MRWW4EXCTNPWF4KZER99EEKSTMVDE6HYMP0VG6N2VMXX4SKXC33XYEXVVTYXUMNXEFCXQCXYEP5X9JKZCMZXVESU28Y7U',
      )
    })

    it('should decode a mixed-case amount key', () => {
      const { satoshis } = decodeBip21('bitcoin:bc1qexampleaddr?Amount=0.0005')
      expect(satoshis).toBe(50_000)
    })

    it('should throw an error for an invalid address', () => {
      expect(() => decodeBip21('invalidBip21')).toThrow('Invalid BIP21 URI')
    })

    it('accepts uppercase param names with a lowercase key value', () => {
      const uri = `bitcoin:?ark=${ARK}&ASSETID=${ASSET}&amount=500&TAXI=https%3A%2F%2Ftaxi.example&TaxiKey=${KEY}`
      expect(decodeBip21(uri).taxi).toEqual({ url: 'https://taxi.example', operatorKey: KEY })
    })

    it('drops all three taxi params when the key value has uppercase letters', () => {
      const uri = `bitcoin:?ark=${ARK}&assetid=${ASSET}&amount=500&taxi=https%3A%2F%2Ftaxi.example&taxikey=${KEY.toUpperCase()}`
      const out = decodeBip21(uri)
      expect(out.taxi).toBeUndefined()
      expect(out.assetId).toBe(ASSET)
      expect(out.assetAmount).toBe('500')
    })

    it('drops taxi without taxikey rather than throwing', () => {
      const out = decodeBip21(`bitcoin:?ark=${ARK}&assetid=${ASSET}&amount=500&taxi=https%3A%2F%2Ftaxi.example`)
      expect(out.taxi).toBeUndefined()
      expect(out.assetAmount).toBe('500')
    })

    it('drops a taxikey that is not 64 lowercase hex characters', () => {
      expect(decodeBip21(`bitcoin:?ark=${ARK}&taxi=https%3A%2F%2Ftaxi.example&taxikey=NOTHEX`).taxi).toBeUndefined()
    })

    it('drops a non-http taxi url', () => {
      expect(decodeBip21(`bitcoin:?ark=${ARK}&taxi=file%3A%2F%2F%2Fetc&taxikey=${KEY}`).taxi).toBeUndefined()
    })

    it('drops an orphan taxifare with no valid taxi/taxikey', () => {
      const out = decodeBip21(`bitcoin:?ark=${ARK}&assetid=${ASSET}&amount=500&taxifare=flat`)
      expect(out.taxi).toBeUndefined()
      expect(out.assetAmount).toBe('500')
    })

    it('treats an empty taxifare as absent', () => {
      const out = decodeBip21(`bitcoin:?ark=${ARK}&taxi=https%3A%2F%2Ftaxi.example&taxikey=${KEY}&taxifare=`)
      expect(out.taxi).toEqual({ url: 'https://taxi.example', operatorKey: KEY })
    })
  })

  describe('encodeBip21', () => {
    it('should encode a valid bip21 URI', () => {
      const { address, bip21, arkAddress, invoice, satoshis } = fixtures.lib.bip21
      expect(encodeBip21(address, arkAddress, invoice, satoshis)).toEqual(bip21)
    })

    it('should encode a valid bip21 URI without ark address', () => {
      const { address, bip21, invoice, satoshis } = fixtures.lib.bip21
      const bip21WithoutArk = bip21.replace(/([?&])ark=[^&]+(&|$)/i, '$1').replace(/&$/, '')
      expect(encodeBip21(address!, '', invoice!, satoshis!)).toEqual(bip21WithoutArk)
    })

    it('should not group the amount with thousands separators', () => {
      // 1000 BTC — large enough that Intl number formatting would insert a comma
      const uri = encodeBip21('bc1qexampleaddr', '', '', 100_000_000_000)
      expect(uri).not.toContain(',')
      expect(uri).toContain('amount=1000')
    })
  })

  describe('encodeBip21Asset taxi params', () => {
    it('encodes the three taxi params', () => {
      expect(
        encodeBip21Asset(ARK, ASSET, 500n, 0, { url: 'https://taxi.example', operatorKey: KEY, fareId: 'flat' }),
      ).toBe(
        `bitcoin:?ark=${ARK}&assetid=${ASSET}&amount=500&taxi=https%3A%2F%2Ftaxi.example&taxikey=${KEY}&taxifare=flat`,
      )
    })

    it('omits the taxi params when none are given', () => {
      expect(encodeBip21Asset(ARK, ASSET, 500n, 0)).toBe(`bitcoin:?ark=${ARK}&assetid=${ASSET}&amount=500`)
    })

    it('round-trips through decode', () => {
      const taxi: Bip21Taxi = { url: 'https://taxi.example', operatorKey: KEY, fareId: 'flat' }
      const uri = encodeBip21Asset(ARK, ASSET, 500n, 0, taxi)
      expect(decodeBip21(uri).taxi).toEqual(taxi)
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
