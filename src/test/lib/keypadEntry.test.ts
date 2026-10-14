import { describe, expect, it } from 'vitest'
import { MAX_ENTRY_DIGITS, digitsToValue, popDigit, pushDigit, valueToDigits } from '../../lib/keypadEntry'

describe('keypadEntry', () => {
  it.each([
    ['12', 0, '12'],
    ['12', 8, '0.00000012'],
    ['20000', 8, '0.00020000'],
    ['1716', 2, '17.16'],
    ['5', 2, '0.05'],
    ['', 8, ''],
  ])('shows %s at %i decimals as %s', (digits, decimals, value) => {
    expect(digitsToValue(digits, decimals)).toBe(value)
  })

  it('fills from the right and drops leading zeros', () => {
    expect(pushDigit(pushDigit('', '1'), '2')).toBe('12')
    expect(pushDigit('', '0')).toBe('')
    expect(popDigit('12')).toBe('1')
    expect(popDigit('')).toBe('')
  })

  it('refuses digits past the cap, so a value never reaches exponent notation', () => {
    const full = '9'.repeat(MAX_ENTRY_DIGITS)
    expect(pushDigit(full, '9')).toBe(full)
    expect(digitsToValue(full, 8)).not.toMatch(/e/)
  })

  it.each([
    ['0.0002', 8, '20000'],
    ['17.16', 2, '1716'],
    ['17.1', 2, '1710'],
    ['5000', 0, '5000'],
    ['0', 8, ''],
    ['1.234567891', 8, '123456789'],
  ])('reads %s back at %i decimals as digits %s', (value, decimals, digits) => {
    expect(valueToDigits(value, decimals)).toBe(digits)
  })
})
