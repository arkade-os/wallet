import { describe, expect, it } from 'vitest'
import fixtures from '../fixtures.json'
import {
  centsToUnits,
  isValidAssetId,
  isValidDecimals,
  prettyAssetAmount,
  prettyAssetAmountHide,
  prettyAssetNumber,
  truncatedAssetId,
  unitsToCents,
} from '../../lib/assets'

describe('asset utilities', () => {
  describe('isValidAssetId', () => {
    it('should return true for a valid asset ID', () => {
      expect(isValidAssetId(fixtures.lib.asset.id)).toBe(true)
    })

    it('should accept uppercase hex', () => {
      expect(isValidAssetId('A'.repeat(68))).toBe(true)
    })

    it('should return false for an invalid asset ID', () => {
      expect(isValidAssetId('invalidAssetId')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidAssetId('')).toBe(false)
    })

    it('should return false for a 67-char hex string', () => {
      expect(isValidAssetId('a'.repeat(67))).toBe(false)
    })

    it('should return false for a 69-char hex string', () => {
      expect(isValidAssetId('a'.repeat(69))).toBe(false)
    })

    it('should return false for a 68-char string with non-hex chars', () => {
      expect(isValidAssetId('z'.repeat(68))).toBe(false)
    })
  })

  describe('isValidDecimals', () => {
    it('accepts non-negative integers up to 18', () => {
      expect(isValidDecimals(0)).toBe(true)
      expect(isValidDecimals(8)).toBe(true)
      expect(isValidDecimals(18)).toBe(false)
    })

    it('rejects values above 18', () => {
      expect(isValidDecimals(19)).toBe(false)
      expect(isValidDecimals(309)).toBe(false)
    })

    it('rejects negative values', () => {
      expect(isValidDecimals(-1)).toBe(false)
    })

    it('rejects non-integers', () => {
      expect(isValidDecimals(1.5)).toBe(false)
    })

    it('rejects NaN and Infinity', () => {
      expect(isValidDecimals(NaN)).toBe(false)
      expect(isValidDecimals(Infinity)).toBe(false)
    })
  })

  describe('truncatedAssetId', () => {
    it('should truncate a long id to first12...last12', () => {
      const id = fixtures.lib.asset.id
      expect(truncatedAssetId(id)).toBe(`${id.slice(0, 12)}...${id.slice(-12)}`)
    })

    it('should return empty string for empty input', () => {
      expect(truncatedAssetId('')).toBe('')
    })

    it('should return empty string for input shorter than 24 chars', () => {
      expect(truncatedAssetId('abcdef')).toBe('')
      expect(truncatedAssetId('a'.repeat(23))).toBe('')
    })

    it('should truncate inputs of exactly 24 chars', () => {
      const id = 'a'.repeat(24)
      expect(truncatedAssetId(id)).toBe(`${id.slice(0, 12)}...${id.slice(-12)}`)
    })

    it('should treat undefined as empty', () => {
      expect(truncatedAssetId(undefined as unknown as string)).toBe('')
    })
  })

  describe('unitsToCents', () => {
    it('should convert units to cents using default decimals=8', () => {
      expect(unitsToCents('0')).toBe(BigInt(0))
      expect(unitsToCents('1')).toBe(BigInt(100_000_000))
      expect(unitsToCents('123')).toBe(BigInt(12_300_000_000))
    })

    it('should support decimals=0 as a no-op', () => {
      expect(unitsToCents('0', 0)).toBe(BigInt(0))
      expect(unitsToCents('123', 0)).toBe(BigInt(123))
    })

    it('should support arbitrary integer decimals', () => {
      expect(unitsToCents('2', 2)).toBe(BigInt(200))
      expect(unitsToCents('2', 8)).toBe(BigInt(200_000_000))
    })

    it('should preserve sign for negative units', () => {
      expect(unitsToCents('-5', 8)).toBe(BigInt(-500_000_000))
    })

    // ---- bad-decimals fallback: returns units unchanged (no throw) ----

    it('returns units unchanged for negative decimals', () => {
      expect(unitsToCents('1', -1)).toBe(BigInt(1))
    })

    it('returns units unchanged for non-integer decimals', () => {
      expect(unitsToCents('1', 1.5)).toBe(BigInt(1))
    })

    it('returns units unchanged for NaN decimals', () => {
      expect(unitsToCents('1', NaN)).toBe(BigInt(1))
    })

    it('returns units unchanged for decimals beyond MAX_DECIMALS', () => {
      expect(unitsToCents('1', 19)).toBe(BigInt(1))
      expect(unitsToCents('1', 309)).toBe(BigInt(1))
    })
  })

  describe('centsToUnits', () => {
    it('should convert cents to units using default decimals=8', () => {
      expect(centsToUnits(BigInt(0))).toBe('0')
      expect(centsToUnits(BigInt(100_000_000))).toBe('1')
    })

    it('should support decimals=0 as a no-op', () => {
      expect(centsToUnits(BigInt(123), 0)).toBe('123')
    })

    it('should preserve sign for negative cents', () => {
      expect(centsToUnits(BigInt(-200_000_000), 8)).toBe('-2')
    })

    // ---- bad-decimals fallback: returns cents unchanged (no throw) ----

    it('returns cents unchanged for negative decimals', () => {
      expect(centsToUnits(BigInt(1), -1)).toBe('1')
    })

    it('returns cents unchanged for non-integer decimals', () => {
      expect(centsToUnits(BigInt(1), 1.5)).toBe('1')
    })

    it('returns cents unchanged for NaN decimals', () => {
      expect(centsToUnits(BigInt(1), NaN)).toBe('1')
    })

    it('returns cents unchanged for decimals beyond MAX_DECIMALS', () => {
      expect(centsToUnits(BigInt(100_000_000), 19)).toBe('100000000')
    })
  })

  describe('prettyAssetNumber', () => {
    it('returns "0" when num is undefined', () => {
      expect(prettyAssetNumber(undefined)).toBe('0')
    })

    it('returns "0" when num is null', () => {
      expect(prettyAssetNumber(null as unknown as string)).toBe('0')
    })

    it('formats bigint with grouping by default', () => {
      expect(prettyAssetNumber('0')).toBe('0')
      expect(prettyAssetNumber('1000')).toBe('1,000')
      expect(prettyAssetNumber('-1000')).toBe('-1,000')
      expect(prettyAssetNumber('123456789')).toBe('123,456,789')
      expect(prettyAssetNumber('-123456789')).toBe('-123,456,789')
    })

    it('formats negative bigint', () => {
      expect(prettyAssetNumber('-1000')).toBe('-1,000')
    })

    it('formats very small number', () => {
      expect(prettyAssetNumber('0.00000001')).toBe('0.00000001')
      expect(prettyAssetNumber('-0.00000001')).toBe('-0.00000001')
    })

    it('formats number with grouping', () => {
      expect(prettyAssetNumber('123,456.789')).toBe('123,456.789')
      expect(prettyAssetNumber('-123,456.789')).toBe('-123,456.789')
    })

    it('formats very large bigints without precision loss', () => {
      expect(prettyAssetNumber((BigInt(10) ** BigInt(30)).toString(), 0)).toBe('1' + ',000'.repeat(10))
    })
  })

  describe('prettyAssetAmount', () => {
    it('formats with decimals=0 (no division)', () => {
      expect(prettyAssetAmount(BigInt(0), 0)).toBe('0')
      expect(prettyAssetAmount(BigInt(123), 0)).toBe('123')
      expect(prettyAssetAmount(BigInt(1_000_000), 0)).toBe('1,000,000')
    })

    it('formats whole units with decimals=8', () => {
      expect(prettyAssetAmount(BigInt(100_000_000), 8)).toBe('1')
      expect(prettyAssetAmount(BigInt(0), 8)).toBe('0')
    })

    it('formats fractional units precisely', () => {
      expect(prettyAssetAmount(BigInt(150_000_000), 8)).toBe('1.5')
      expect(prettyAssetAmount(BigInt(99_999_999), 8)).toBe('0.99999999')
    })

    it('renders smallest representable unit with leading zeros', () => {
      expect(prettyAssetAmount(BigInt(1), 8)).toBe('0.00000001')
      expect(prettyAssetAmount(BigInt(10), 8)).toBe('0.0000001')
    })

    it('strips trailing zeros from the fractional part', () => {
      expect(prettyAssetAmount(BigInt(110_000_000), 8)).toBe('1.1')
      expect(prettyAssetAmount(BigInt(120_000_000), 8)).toBe('1.2')
    })

    it('formats negative fractional amounts', () => {
      expect(prettyAssetAmount(BigInt(-150_000_000), 8)).toBe('-1.5')
      expect(prettyAssetAmount(BigInt(-1), 8)).toBe('-0.00000001')
    })

    it('preserves precision beyond Number.MAX_SAFE_INTEGER', () => {
      // 9_007_199_254_740_993 is 2^53 + 1 — not representable as a Number.
      expect(prettyAssetAmount(BigInt(9_007_199_254_740_993), 8)).toBe('90,071,992')
    })

    it('formats when tidy=false (default)', () => {
      expect(prettyAssetAmount(BigInt(9_007_199_254_740_993), 8, false)).toBe('90,071,992')
      expect(prettyAssetAmount(BigInt(150_000_000), 8, false)).toBe('1.5')
      expect(prettyAssetAmount(BigInt(1_234_567), 0, false)).toBe('1,234,567')
    })

    // ---- bad-decimals fallback: format as integer (no throw) ----

    it('falls back to integer format for negative decimals', () => {
      expect(prettyAssetAmount(BigInt(123), -1)).toBe('123')
    })

    it('falls back to integer format for non-integer decimals', () => {
      expect(prettyAssetAmount(BigInt(123), 1.5)).toBe('123')
    })

    it('falls back to integer format for NaN decimals', () => {
      // Previously crashed <Mint /> when the decimals input was empty
      // (parsedDecimals became NaN in the live preview).
      expect(prettyAssetAmount(BigInt(123), NaN)).toBe('123')
    })

    it('tidy up big amounts when tidy=true', () => {
      expect(prettyAssetAmount(BigInt(123), 0, true)).toBe('123')
      expect(prettyAssetAmount(BigInt(123_456), 0, true)).toBe('123K')
      expect(prettyAssetAmount(BigInt(123_456_789), 0, true)).toBe('123M')
      expect(prettyAssetAmount(BigInt(123_456_789_012), 0, true)).toBe('123B')
      expect(prettyAssetAmount(BigInt(123_456_789_012_345), 0, true)).toBe('123T')
      expect(prettyAssetAmount(BigInt(-123_456_789_012_345), 0, true)).toBe('-123T')
      expect(prettyAssetAmount(BigInt(-123_456_789_012_345), 3, true)).toBe('-123B')
      expect(prettyAssetAmount(BigInt(123_456_789_012_345), 3, true)).toBe('123B')
      expect(prettyAssetAmount(BigInt(123_456_789_012), 3, true)).toBe('123M')
      expect(prettyAssetAmount(BigInt(123_456_789), 3, true)).toBe('123K')
      expect(prettyAssetAmount(BigInt(123_456), 3, true)).toBe('123.456')
      expect(prettyAssetAmount(BigInt(123), 3, true)).toBe('0.123')
    })

    it('handles negative values when tidy=true', () => {
      expect(prettyAssetAmount(BigInt(-987_654_321), 0, true)).toBe('-987M')
    })

    it('does not add suffix when tidy=true but amount is under 1K', () => {
      expect(prettyAssetAmount(BigInt(999), 0, true)).toBe('999')
    })
  })

  describe('prettyAssetAmountHide', () => {
    it('returns empty string for falsy value (0n)', () => {
      expect(prettyAssetAmountHide(BigInt(0), 'TKN')).toBe('')
    })

    it('returns dots + suffix for non-zero value', () => {
      // "123".length === 3 → max(6, 6) = 6 dots
      expect(prettyAssetAmountHide(BigInt(123), 'TKN')).toBe(`${'·'.repeat(6)} TKN`)
    })

    it('returns dots only when suffix is empty', () => {
      expect(prettyAssetAmountHide(BigInt(123), '')).toBe('·'.repeat(6))
    })

    it('scales dot count to 2x the digit count when value is long', () => {
      // "123456789".length === 9 → max(18, 6) = 18 dots
      expect(prettyAssetAmountHide(BigInt(123_456_789), 'TKN')).toBe(`${'·'.repeat(18)} TKN`)
    })
  })
})
