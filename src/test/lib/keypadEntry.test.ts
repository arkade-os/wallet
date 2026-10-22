import { describe, expect, it } from 'vitest'
import { MAX_SATS, digitsToValue, maxEntryDigits, popDigit, pushDigit, valueToDigits } from '../../lib/keypadEntry'

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
    expect(pushDigit(pushDigit('', '1', 0), '2', 0)).toBe('12')
    expect(pushDigit('', '0', 0)).toBe('')
    expect(popDigit('12')).toBe('1')
    expect(popDigit('')).toBe('')
  })

  it.each([
    [0, 16],
    [8, 20],
    [18, 30],
  ])('refuses digits past the cap at %i decimals', (decimals, cap) => {
    expect(maxEntryDigits(decimals)).toBe(cap)
    const full = '9'.repeat(cap)
    expect(pushDigit(full, '9', decimals)).toBe(full)
    expect(pushDigit(full.slice(1), '9', decimals)).toBe(full)
  })

  it.each([0, 8])('refuses a digit past 21 M BTC at %i decimals, short of the digit cap', (decimals) => {
    const max = MAX_SATS.toString()
    expect(pushDigit(max.slice(0, -1), '0', decimals, MAX_SATS)).toBe(max)
    expect(pushDigit(max.slice(0, -1), '1', decimals, MAX_SATS)).toBe(max.slice(0, -1))
    expect(pushDigit(max, '0', decimals, MAX_SATS)).toBe(max)
  })

  it('keeps a long 18-decimal asset balance whole', () => {
    expect(valueToDigits('1000.5', 18)).toBe('10005' + '0'.repeat(17))
  })

  it('keeps an over-cap value exact, and takes no more digits on it', () => {
    const balance = '1' + '0'.repeat(20)
    expect(valueToDigits(balance, 0)).toBe(balance)
    expect(pushDigit(balance, '5', 0)).toBe(balance)
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
