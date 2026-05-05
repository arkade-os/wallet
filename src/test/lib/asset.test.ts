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
      expect(isValidDecimals(18)).toBe(true)
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
      expect(unitsToCents(0n)).toBe(0n)
      expect(unitsToCents(1n)).toBe(100_000_000n)
      expect(unitsToCents(123n)).toBe(12_300_000_000n)
    })

    it('should support decimals=0 as a no-op', () => {
      expect(unitsToCents(0n, 0)).toBe(0n)
      expect(unitsToCents(123n, 0)).toBe(123n)
    })

    it('should support arbitrary integer decimals', () => {
      expect(unitsToCents(2n, 2)).toBe(200n)
      expect(unitsToCents(2n, 18)).toBe(2_000_000_000_000_000_000n)
    })

    it('should preserve sign for negative units', () => {
      expect(unitsToCents(-5n, 8)).toBe(-500_000_000n)
    })

    // ---- bad-decimals fallback: returns units unchanged (no throw) ----

    it('returns units unchanged for negative decimals', () => {
      expect(unitsToCents(1n, -1)).toBe(1n)
    })

    it('returns units unchanged for non-integer decimals', () => {
      expect(unitsToCents(1n, 1.5)).toBe(1n)
    })

    it('returns units unchanged for NaN decimals', () => {
      expect(unitsToCents(1n, NaN)).toBe(1n)
    })

    it('returns units unchanged for decimals beyond MAX_DECIMALS', () => {
      expect(unitsToCents(1n, 19)).toBe(1n)
      expect(unitsToCents(1n, 309)).toBe(1n)
    })
  })

  describe('centsToUnits', () => {
    it('should convert cents to units using default decimals=8', () => {
      expect(centsToUnits(0n)).toBe(0n)
      expect(centsToUnits(100_000_000n)).toBe(1n)
    })

    it('should floor-divide (truncate fractional units)', () => {
      // 1.5 units expressed as cents — fractional part is dropped.
      expect(centsToUnits(150_000_000n, 8)).toBe(1n)
      // 0.99999999 units — also truncates to 0.
      expect(centsToUnits(99_999_999n, 8)).toBe(0n)
    })

    it('should support decimals=0 as a no-op', () => {
      expect(centsToUnits(123n, 0)).toBe(123n)
    })

    it('should preserve sign for negative cents', () => {
      expect(centsToUnits(-200_000_000n, 8)).toBe(-2n)
    })

    // ---- bad-decimals fallback: returns cents unchanged (no throw) ----

    it('returns cents unchanged for negative decimals', () => {
      expect(centsToUnits(1n, -1)).toBe(1n)
    })

    it('returns cents unchanged for non-integer decimals', () => {
      expect(centsToUnits(1n, 1.5)).toBe(1n)
    })

    it('returns cents unchanged for NaN decimals', () => {
      expect(centsToUnits(1n, NaN)).toBe(1n)
    })

    it('returns cents unchanged for decimals beyond MAX_DECIMALS', () => {
      expect(centsToUnits(100_000_000n, 19)).toBe(100_000_000n)
    })

    // The TS signature requires bigint; passing a Number is a programmer
    // error caught by the type checker. We don't soft-coerce at runtime —
    // callers should fix their types instead.
    it('still throws TypeError when cents is a Number (TS contract violation)', () => {
      expect(() => centsToUnits(150_000_000 as unknown as bigint, 8)).toThrow(TypeError)
    })
  })

  describe('prettyAssetNumber', () => {
    it('returns "0" when num is undefined', () => {
      expect(prettyAssetNumber(undefined)).toBe('0')
    })

    it('returns "0" when num is null', () => {
      expect(prettyAssetNumber(null as unknown as bigint)).toBe('0')
    })

    it('formats bigint with grouping by default', () => {
      expect(prettyAssetNumber(0n)).toBe('0')
      expect(prettyAssetNumber(1_000n)).toBe('1,000')
      expect(prettyAssetNumber(123_456_789n)).toBe('123,456,789')
    })

    it('formats negative bigint', () => {
      expect(prettyAssetNumber(-1_000n)).toBe('-1,000')
    })

    it('formats without grouping when useGrouping=false', () => {
      expect(prettyAssetNumber(123_456_789n, 8, false)).toBe('123456789')
    })

    it('formats very large bigints without precision loss', () => {
      expect(prettyAssetNumber(10n ** 30n, 0, false)).toBe('1' + '0'.repeat(30))
    })

    // ---- critical error paths: Intl.NumberFormat rejects out-of-range options ----

    it('throws RangeError for negative maximumFractionDigits', () => {
      expect(() => prettyAssetNumber(1n, -1)).toThrow(RangeError)
    })

    it('throws RangeError for maximumFractionDigits > 100', () => {
      expect(() => prettyAssetNumber(1n, 101)).toThrow(RangeError)
    })

    it('throws RangeError for NaN maximumFractionDigits', () => {
      expect(() => prettyAssetNumber(1n, NaN)).toThrow(RangeError)
    })
  })

  describe('prettyAssetAmount', () => {
    it('formats with decimals=0 (no division)', () => {
      expect(prettyAssetAmount(0n, 0)).toBe('0')
      expect(prettyAssetAmount(123n, 0)).toBe('123')
      expect(prettyAssetAmount(1_000_000n, 0)).toBe('1,000,000')
    })

    it('formats whole units with decimals=8', () => {
      expect(prettyAssetAmount(100_000_000n, 8)).toBe('1')
      expect(prettyAssetAmount(0n, 8)).toBe('0')
    })

    // Documents a current logic shortcoming: `centsToUnits` floors before
    // formatting, so any sub-unit precision is lost. 1.5 units (with 8
    // decimals) renders as "1", not "1.5".
    it('drops fractional units due to BigInt floor-division (current behavior)', () => {
      expect(prettyAssetAmount(150_000_000n, 8)).toBe('1')
      expect(prettyAssetAmount(99_999_999n, 8)).toBe('0')
    })

    // ---- bad-decimals fallback: format as integer (no throw) ----

    it('falls back to integer format for negative decimals', () => {
      expect(prettyAssetAmount(123n, -1)).toBe('123')
    })

    it('falls back to integer format for non-integer decimals', () => {
      expect(prettyAssetAmount(123n, 1.5)).toBe('123')
    })

    it('falls back to integer format for NaN decimals', () => {
      // Previously crashed <Mint /> when the decimals input was empty
      // (parsedDecimals became NaN in the live preview).
      expect(prettyAssetAmount(123n, NaN)).toBe('123')
    })
  })

  describe('prettyAssetAmountHide', () => {
    it('returns empty string for falsy value (0n)', () => {
      expect(prettyAssetAmountHide(0n, 'TKN')).toBe('')
    })

    it('returns dots + suffix for non-zero value', () => {
      // "123".length === 3 → max(6, 6) = 6 dots
      expect(prettyAssetAmountHide(123n, 'TKN')).toBe(`${'·'.repeat(6)} TKN`)
    })

    it('returns dots only when suffix is empty', () => {
      expect(prettyAssetAmountHide(123n, '')).toBe('·'.repeat(6))
    })

    it('scales dot count to 2x the digit count when value is long', () => {
      // "123456789".length === 9 → max(18, 6) = 18 dots
      expect(prettyAssetAmountHide(123_456_789n, 'TKN')).toBe(`${'·'.repeat(18)} TKN`)
    })
  })
})
