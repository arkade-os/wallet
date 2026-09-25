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
      fetchMocker.mockResponseOnce(JSON.stringify({ pr: fixtures.lib.bolt11.invoice }))
      const payRequest = await lnurlClient.resolve(test.lnUrlOrAddress)
      const result = await lnurlClient.requestInvoice(payRequest, { amountSat: fixtures.lib.bolt11.amountSats })
      if (result.kind !== 'bolt11') throw new Error('Expected a lightning invoice')
      expect(result.pr).toBe(fixtures.lib.bolt11.invoice)
    }
  })

  const invoiceFor = async (pr: string, amountSat: number) => {
    fetchMocker.mockResponseOnce(JSON.stringify(mockLNURLResponse))
    fetchMocker.mockResponseOnce(JSON.stringify({ pr }))
    return lnurlClient.requestInvoice(await lnurlClient.resolve(fixtures.lib.lnurl[0].lnUrlOrAddress), { amountSat })
  }

  it('should refuse an invoice that does not decode', async () => {
    await expect(invoiceFor('lnbc12345678', fixtures.lib.bolt11.amountSats)).rejects.toThrow(/does not decode/)
  })

  it('should refuse an invoice for another amount than the one requested', async () => {
    await expect(invoiceFor(fixtures.lib.bolt11.invoice, fixtures.lib.bolt11.amountSats + 100)).rejects.toThrow(
      /not the requested/,
    )
  })
})
