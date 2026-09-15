import fixtures from '../fixtures.json'
import createFetchMock from 'vitest-fetch-mock'
import { describe, expect, it, vi } from 'vitest'
import { createLnurlClient, isValidLnUrl, toPayRequestUrl } from '@arkade-os/lnurl-client'

const fetchMocker = createFetchMock(vi)

fetchMocker.enableMocks()

// Built after enableMocks so the client binds the mocked fetch, not the real one.
const lnurlClient = createLnurlClient()

const mockLNURLResponse = {
  tag: 'payRequest',
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
      expect(toPayRequestUrl(test.lnUrlOrAddress).url).toBe(test.callback)
    }
  })

  it('should fetch lnurl conditions', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      expect(await lnurlClient.resolve(test.lnUrlOrAddress)).toEqual({
        ...localMockResponse,
        source: { url: test.callback, surface: 'address' },
      })
    }
  })

  it('should fetch lightning invoice', async () => {
    for (const test of fixtures.lib.lnurl) {
      const localMockResponse = { ...mockLNURLResponse, callback: test.callback }
      fetchMocker.mockResponseOnce(JSON.stringify(localMockResponse))
      fetchMocker.mockResponseOnce(JSON.stringify({ pr: 'lnbc1234567890' }))
      const payRequest = await lnurlClient.resolve(test.lnUrlOrAddress)
      const result = await lnurlClient.requestInvoice(payRequest, { amountSat: 21 })
      if (result.kind !== 'bolt11') throw new Error('Expected a lightning invoice')
      expect(result.pr).toBe('lnbc1234567890')
    }
  })
})
