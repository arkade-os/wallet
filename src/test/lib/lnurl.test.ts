import fixtures from '../fixtures.json'
import createFetchMock from 'vitest-fetch-mock'
import { describe, expect, it, vi } from 'vitest'
import { createLnurlClient, isValidLnUrl, toPayRequestUrl } from '@arkade-os/lnurl-client'
import { checkLnUrlInvoice } from '../../lib/lnurl'

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

  it('should accept an invoice for the requested amount', () => {
    expect(checkLnUrlInvoice(fixtures.lib.bolt11.invoice, fixtures.lib.bolt11.amountSats)).toBe(
      fixtures.lib.bolt11.invoice,
    )
  })

  it('should throw an error when the invoice is invalid', () => {
    expect(() => checkLnUrlInvoice('lnbc12345678', fixtures.lib.bolt11.amountSats)).toThrow(
      'Server returned an invalid invoice.',
    )
  })

  it('should throw an error when the invoice amount does not match the requested amount', () => {
    expect(() => checkLnUrlInvoice(fixtures.lib.bolt11.invoice, fixtures.lib.bolt11.amountSats + 100)).toThrow(
      'Invoice amount does not match requested amount.',
    )
  })
})
