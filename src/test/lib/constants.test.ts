import { describe, it, expect } from 'vitest'
import { isMainnet } from '../../lib/constants'

describe('isMainnet', () => {
  it('returns true for bitcoin and unrecognized networks', () => {
    expect(isMainnet('bitcoin')).toBe(true)
    expect(isMainnet('some-future-network')).toBe(true)
  })

  it('returns false for known test networks', () => {
    expect(isMainnet('testnet')).toBe(false)
    expect(isMainnet('mutinynet')).toBe(false)
    expect(isMainnet('signet')).toBe(false)
    expect(isMainnet('regtest')).toBe(false)
  })

  it('returns false for an empty network (unreachable ASP or not yet loaded)', () => {
    expect(isMainnet('')).toBe(false)
  })
})
