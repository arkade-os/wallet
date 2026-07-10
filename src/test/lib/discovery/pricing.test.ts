import { describe, expect, it } from 'vitest'
import { computeWantAmount, DiscoveryError, feedPrice, Price } from '../../../lib/discovery'

describe('discovery pricing', () => {
  describe('feedPrice', () => {
    it('normalizes feed values via price_decimals, exactly', () => {
      // feed publishes 65000 * 10^8; price is 65000 quote-units-per-base-unit
      const scaled = feedPrice('6500000000000', { price_decimals: 8, invert: false })
      expect(scaled.num / scaled.den).toBe(BigInt(65000))
      expect(feedPrice('65000.12', { price_decimals: 0, invert: false })).toEqual({
        num: BigInt(6500012),
        den: BigInt(100),
      })
      // scientific notation appears when JSON numbers round-trip through String()
      expect(feedPrice('1.538e-5', { price_decimals: 0, invert: false })).toEqual({
        num: BigInt(1538),
        den: BigInt(100000000),
      })
    })

    it('inverts when the feed quotes the pair the other way around', () => {
      expect(feedPrice('0.00001538', { price_decimals: 0, invert: true })).toEqual({
        num: BigInt(100000000),
        den: BigInt(1538),
      })
    })

    it('rejects zero, negative, and non-numeric observations', () => {
      expect(() => feedPrice('0', { price_decimals: 0, invert: false })).toThrow(DiscoveryError)
      expect(() => feedPrice('-1', { price_decimals: 0, invert: false })).toThrow(DiscoveryError)
      expect(() => feedPrice('not-a-number', { price_decimals: 0, invert: false })).toThrow(DiscoveryError)
    })
  })

  describe('computeWantAmount', () => {
    const price65000: Price = { num: BigInt(65000), den: BigInt(1) }
    const params = { depositAmount: BigInt(1000), price: price65000, direction: 'base-to-quote' as const }

    it('golden: base-to-quote applies the spec formula', () => {
      // floor(1000 * 65000 * (1 - 80/10000)) = floor(65_000_000 * 0.992)
      const want = computeWantAmount({ ...params, feeBps: 30, safetyBps: 50 })
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
      expect(computeWantAmount({ ...params, feeBps: 30 })).toBe(BigInt(64480000))
    })

    it('floors at rounding boundaries', () => {
      const third: Price = { num: BigInt(1), den: BigInt(3) }
      const exact = { price: third, feeBps: 0, safetyBps: 0, direction: 'base-to-quote' as const }
      expect(computeWantAmount({ ...exact, depositAmount: BigInt(3) })).toBe(BigInt(1))
      expect(computeWantAmount({ ...exact, depositAmount: BigInt(2) })).toBe(BigInt(0))
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

    it('rejects feeBps + safetyBps >= 10000 and invalid bps or deposits', () => {
      expect(() => computeWantAmount({ ...params, feeBps: 9950, safetyBps: 50 })).toThrow(DiscoveryError)
      expect(computeWantAmount({ ...params, feeBps: 9949, safetyBps: 50 })).toBeGreaterThan(BigInt(0))
      expect(() => computeWantAmount({ ...params, feeBps: -1 })).toThrow(DiscoveryError)
      expect(() => computeWantAmount({ ...params, feeBps: 0.5 })).toThrow(DiscoveryError)
      expect(() => computeWantAmount({ ...params, depositAmount: BigInt(0), feeBps: 30 })).toThrow(DiscoveryError)
    })
  })
})
