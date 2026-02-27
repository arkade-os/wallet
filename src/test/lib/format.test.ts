import { describe, it, expect } from 'vitest'
import {
  prettyAmount,
  prettyAgo,
  prettyDate,
  prettyHide,
  fromSatoshis,
  toSatoshis,
  prettyDelta,
  prettyLongText,
  prettyNumber,
} from '../../lib/format'

describe('format utilities', () => {
  describe('fromSatoshis', () => {
    it('should convert from satoshis to btc correctly', () => {
      expect(fromSatoshis(0)).toBe(0)
      expect(fromSatoshis(100)).toBe(0.000001)
      expect(fromSatoshis(999)).toBe(0.00000999)
      expect(fromSatoshis(100_000_000)).toBe(1)
    })
  })

  describe('toSatoshis', () => {
    it('should convert from btc to satoshis correctly', () => {
      expect(toSatoshis(0)).toBe(0)
      expect(toSatoshis(0.000001)).toBe(100)
      expect(toSatoshis(0.00000999)).toBe(999)
      expect(toSatoshis(1)).toBe(100_000_000)
    })
  })

  describe('prettyAmount', () => {
    it('should format amounts with ₿ prefix', () => {
      expect(prettyAmount(0)).toBe('₿0')
      expect(prettyAmount(100)).toBe('₿100')
      expect(prettyAmount(999)).toBe('₿999')
    })

    it('should format large amounts as integers with ₿ prefix', () => {
      expect(prettyAmount(50000000)).toBe('₿50,000,000')
      expect(prettyAmount(100000000)).toBe('₿100,000,000')
      expect(prettyAmount(150000000)).toBe('₿150,000,000')
    })

    it('should handle fiat currency formatting', () => {
      expect(prettyAmount(2500, 'USD')).toBe('2,500 USD')
      expect(prettyAmount(12345, 'EUR')).toBe('12,345 EUR')
    })
  })

  describe('prettyAgo', () => {
    const now = Date.now()
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour

    it('should format recent times', () => {
      expect(prettyAgo(now)).toBe('just now')
      expect(prettyAgo(now - 30 * 1000)).toBe('30s ago')
      expect(prettyAgo(now - 2 * minute)).toBe('2m ago')
    })

    it('should format recent times with long format', () => {
      expect(prettyAgo(now, true)).toBe('just now')
      expect(prettyAgo(now - 30 * 1000, true)).toBe('30 seconds ago')
      expect(prettyAgo(now - 2 * minute, true)).toBe('2 minutes ago')
    })

    it('should format hours and days', () => {
      expect(prettyAgo(now - 2 * hour)).toBe('2h ago')
      expect(prettyAgo(now - 3 * day)).toBe('3d ago')
    })

    it('should format hours and days with long format', () => {
      expect(prettyAgo(now - 2 * hour, true)).toBe('2 hours ago')
      expect(prettyAgo(now - 3 * day, true)).toBe('3 days ago')
    })
  })

  describe('prettyDate', () => {
    it('should format dates correctly', () => {
      const d = new Date('2023-12-25T10:30:00Z')
      const tsSec = Math.floor(d.getTime() / 1000)
      const result = prettyDate(tsSec)
      const expected = new Intl.DateTimeFormat('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        minute: '2-digit',
        hour: '2-digit',
      }).format(d)
      expect(result).toBe(expected)
    })
  })

  describe('prettyDelta', () => {
    it('should format deltas correctly', () => {
      expect(prettyDelta(0)).toBe('')
      expect(prettyDelta(100)).toBe('1 minute')
      expect(prettyDelta(1000)).toBe('16 minutes')
      expect(prettyDelta(100000)).toBe('1 day')
      expect(prettyDelta(1000000)).toBe('11 days')
    })

    it('should format deltas correctly in short format', () => {
      expect(prettyDelta(0, false)).toBe('')
      expect(prettyDelta(100, false)).toBe('1m')
      expect(prettyDelta(1000, false)).toBe('16m')
      expect(prettyDelta(100000, false)).toBe('1d')
      expect(prettyDelta(1000000, false)).toBe('11d')
    })
  })

  describe('prettyHide', () => {
    it('should return masked value', () => {
      expect(prettyHide(0)).toBe('')
      expect(prettyHide(12345)).toBe('··········')
      expect(prettyHide(999999999)).toBe('··················')
    })

    it('should append fiat suffix when provided', () => {
      expect(prettyHide(12345, 'USD')).toBe('·········· USD')
    })
  })

  describe('prettyLongText', () => {
    it('should format long text correctly', () => {
      expect(prettyLongText('')).toBe('')
      expect(prettyLongText('Hello, world!')).toBe('Hello, world!')
      expect(prettyLongText('0123456789abcdef0123456789abcdef')).toBe('0123456789a...56789abcdef')
    })

    it('should format long text correctly with different lengths', () => {
      expect(prettyLongText('', 3)).toBe('')
      expect(prettyLongText('Hello, world!', 3)).toBe('Hel...ld!')
      expect(prettyLongText('0123456789abcdef0123456789abcdef', 3)).toBe('012...def')
    })
  })

  describe('prettyNumber', () => {
    it('should format numbers correctly', () => {
      expect(prettyNumber(0)).toBe('0')
      expect(prettyNumber(1000)).toBe('1,000')
      expect(prettyNumber(1000000)).toBe('1,000,000')
    })

    it('should format negative numbers correctly', () => {
      expect(prettyNumber(-1000)).toBe('-1,000')
      expect(prettyNumber(-1000000)).toBe('-1,000,000')
    })

    it('should format fractional numbers correctly', () => {
      expect(prettyNumber(1000.123)).toBe('1,000.123')
      expect(prettyNumber(1000000.456)).toBe('1,000,000.456')
      expect(prettyNumber(0.123)).toBe('0.123')
      expect(prettyNumber(0.12345678)).toBe('0.12345678')
      expect(prettyNumber(0.123456789)).toBe('0.12345679') // max 8 fractional digits, rounded
      expect(prettyNumber(0.111111111222)).toBe('0.11111111')
    })

    it('should format fractional numbers with different max fractional digits correctly', () => {
      expect(prettyNumber(0.12345678)).toBe('0.12345678')
      expect(prettyNumber(0.12345678, 7)).toBe('0.1234568')
      expect(prettyNumber(0.12345678, 3)).toBe('0.123')
      expect(prettyNumber(0.12345678, 1)).toBe('0.1')
    })
  })
})
