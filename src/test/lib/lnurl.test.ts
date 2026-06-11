import fixtures from '../fixtures.json'
import createFetchMock from 'vitest-fetch-mock'
import { describe, expect, it, vi } from 'vitest'
import { checkLnUrlConditions, fetchInvoice, getCallbackUrl, isValidLnUrl, isLnAddress } from '../../lib/lnurl'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

const mockLNURLResponse = {
  callback: 'https://pay.staging.galoy.io/.well-known/lnurlp/testing',
  minSendable: 1000,
  maxSendable: 100000000000,
  metadata: 'mock-metadata',
}

describe('lnurl utilities', () => {
  it('should decode lnurl values', async () => {
    for (const test of fixtures.lib.lnurl) {
      expect(test).toHaveProperty('lnUrlOrAddress')
      expect(isValidLnUrl(test.lnUrlOrAddress)).toBe(true)
      expect(getCallbackUrl(test.lnUrlOrAddress)).toBe(test.callback)
    }
  })

  it('should fetch lnurl conditions', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      expect(await checkLnUrlConditions(test.lnUrlOrAddress)).toEqual(localMockResponse)
    }
  })

  it('should fetch lightning invoice', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      fetchMocker.mockResponseOnce(JSON.stringify({ pr: 'lnbc1234567890' }))
      expect(await fetchInvoice(test.lnUrlOrAddress, 21, '')).toBe('lnbc1234567890')
    }
  })
})

describe('isLnAddress / isValidLnUrl edge cases', () => {
  it('accepts valid lightning addresses', () => {
    expect(isValidLnUrl('user@example.com')).toBe(true)
    expect(isValidLnUrl('user@example.org')).toBe(true)
  })

  it('rejects addresses without TLD', () => {
    expect(isValidLnUrl('user@domain')).toBe(false)
    expect(isValidLnUrl('user@')).toBe(false)
  })

  it('rejects addresses with single-char TLD', () => {
    expect(isValidLnUrl('user@a.b')).toBe(false)
  })

  it('rejects non-bech32 lnurl strings', () => {
    expect(isValidLnUrl('lnurl1abc')).toBe(false)
    expect(isValidLnUrl('lnurlblah')).toBe(false)
  })

  it('isLnAddress rejects partial inputs', () => {
    expect(isLnAddress('user@ex')).toBe(false)
    expect(isLnAddress('user@ex.a')).toBe(false) // single-char TLD
  })

  it('isLnAddress accepts 2+ char TLD', () => {
    expect(isLnAddress('user@ex.am')).toBe(true) // 'am' is 2 chars, passes {2,}
  })
})
