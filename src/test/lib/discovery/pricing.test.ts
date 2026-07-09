import { describe, expect, it } from 'vitest'
import { DiscoveryValidationError } from '../../../lib/discovery/errors'
import { computeWantAmount, feedPrice, parseDecimal, Price, priceToDecimalString } from '../../../lib/discovery/pricing'

describe('discovery pricing', () => {
  describe('parseDecimal', () => {
    it('parses integers and decimals exactly', () => {
      expect(parseDecimal('65000')).toEqual({ mantissa: BigInt(65000), scale: 0 })
      expect(parseDecimal('0.00001538')).toEqual({ mantissa: BigInt(1538), scale: 8 })
      expect(parseDecimal('65000.12')).toEqual({ mantissa: BigInt(6500012), scale: 2 })
    })

    it('parses scientific notation from JSON number round-trips', () => {
      expect(parseDecimal('1.538e-5')).toEqual({ mantissa: BigInt(1538), scale: 8 })
      expect(parseDecimal('6.5e4')).toEqual({ mantissa: BigInt(65000), scale: 0 })
    })

    it('rejects non-numeric input', () => {
      expect(() => parseDecimal('not-a-number')).toThrow(DiscoveryValidationError)
      expect(() => parseDecimal('')).toThrow(DiscoveryValidationError)
    })
  })

  describe('feedPrice', () => {
    it('normalizes a scaled-integer feed value via price_decimals', () => {
      // feed publishes 65000 * 10^8; price is 65000 quote-units-per-base-unit
      const price = feedPrice('6500000000000', { price_decimals: 8, invert: false })
      expect(price.num / price.den).toBe(BigInt(65000))
    })

    it('handles a plain decimal feed with price_decimals 0', () => {
      const price = feedPrice('65000.12', { price_decimals: 0, invert: false })
      expect(price).toEqual({ num: BigInt(6500012), den: BigInt(100) })
    })

    it('inverts when the feed quotes the pair the other way around', () => {
      const price = feedPrice('0.00001538', { price_decimals: 0, invert: true })
      expect(price).toEqual({ num: BigInt(100000000), den: BigInt(1538) })
    })

    it('rejects zero or negative observations', () => {
      expect(() => feedPrice('0', { price_decimals: 0, invert: false })).toThrow(DiscoveryValidationError)
      expect(() => feedPrice('-1', { price_decimals: 0, invert: false })).toThrow(DiscoveryValidationError)
    })
  })

  describe('computeWantAmount', () => {
    const price65000: Price = { num: BigInt(65000), den: BigInt(1) }

    it('golden: base-to-quote applies the spec formula', () => {
      // floor(1000 * 65000 * (1 - 80/10000)) = floor(65_000_000 * 0.992)
      const want = computeWantAmount({
        depositAmount: BigInt(1000),
        price: price65000,
        feeBps: 30,
        safetyBps: 50,
        direction: 'base-to-quote',
      })
      expect(want).toBe(BigInt(64480000))
    })

    it('golden: quote-to-base is symmetric with 1/P', () => {
      // floor(6_500_000 / 65000 * 0.992) = floor(100 * 0.992) = 99
      const want = computeWantAmount({
        depositAmount: BigInt(6500000),
        price: price65000,
        feeBps: 30,
        safetyBps: 50,
        direction: 'quote-to-base',
      })
      expect(want).toBe(BigInt(99))
    })

    it('defaults safetyBps to 50', () => {
      const withDefault = computeWantAmount({
        depositAmount: BigInt(1000),
        price: price65000,
        feeBps: 30,
        direction: 'base-to-quote',
      })
      expect(withDefault).toBe(BigInt(64480000))
    })

    it('floors at rounding boundaries', () => {
      const third: Price = { num: BigInt(1), den: BigInt(3) }
      const exact = computeWantAmount({
        depositAmount: BigInt(3),
        price: third,
        feeBps: 0,
        safetyBps: 0,
        direction: 'base-to-quote',
      })
      expect(exact).toBe(BigInt(1))
      const floored = computeWantAmount({
        depositAmount: BigInt(2),
        price: third,
        feeBps: 0,
        safetyBps: 0,
        direction: 'base-to-quote',
      })
      expect(floored).toBe(BigInt(0))
    })

    it('stays exact beyond Number.MAX_SAFE_INTEGER (bigint-only invariant)', () => {
      const want = computeWantAmount({
        depositAmount: BigInt(10) ** BigInt(18),
        price: { num: BigInt(3), den: BigInt(1) },
        feeBps: 0,
        safetyBps: 0,
        direction: 'base-to-quote',
      })
      expect(want).toBe(BigInt(3) * BigInt(10) ** BigInt(18))
    })

    it('rejects feeBps + safetyBps >= 10000', () => {
      const params = { depositAmount: BigInt(1000), price: price65000, direction: 'base-to-quote' as const }
      expect(() => computeWantAmount({ ...params, feeBps: 9950, safetyBps: 50 })).toThrow(DiscoveryValidationError)
      expect(computeWantAmount({ ...params, feeBps: 9949, safetyBps: 50 })).toBeGreaterThan(BigInt(0))
    })

    it('rejects negative or non-integer bps and non-positive deposits', () => {
      const params = { depositAmount: BigInt(1000), price: price65000, direction: 'base-to-quote' as const }
      expect(() => computeWantAmount({ ...params, feeBps: -1, safetyBps: 50 })).toThrow(DiscoveryValidationError)
      expect(() => computeWantAmount({ ...params, feeBps: 30, safetyBps: -1 })).toThrow(DiscoveryValidationError)
      expect(() => computeWantAmount({ ...params, feeBps: 0.5, safetyBps: 0 })).toThrow(DiscoveryValidationError)
      expect(() => computeWantAmount({ ...params, depositAmount: BigInt(0), feeBps: 30, safetyBps: 50 })).toThrow(
        DiscoveryValidationError,
      )
    })
  })

  describe('priceToDecimalString', () => {
    it('renders exact and repeating rationals', () => {
      expect(priceToDecimalString({ num: BigInt(65000), den: BigInt(1) })).toBe('65000')
      expect(priceToDecimalString({ num: BigInt(6500012), den: BigInt(100) })).toBe('65000.12')
      expect(priceToDecimalString({ num: BigInt(1), den: BigInt(3) })).toBe('0.33333333')
    })
  })
})
