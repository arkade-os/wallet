import { afterEach, expect, it, vi } from 'vitest'
import { asset, type IWallet } from '@arkade-os/sdk'
import type { RfqQuote, RfqTransport } from '@arkade-os/swap'

const derive = vi.hoisted(() => vi.fn())
vi.mock('@arkade-os/swap', async (original) => ({
  ...(await original<typeof import('@arkade-os/swap')>()),
  requestArkadeSwap: derive,
  assertArkadeFundable: vi.fn(),
}))
vi.mock('@arkade-os/sdk', async (original) => ({
  ...(await original<typeof import('@arkade-os/sdk')>()),
  RestArkProvider: class {
    async getInfo() {
      return { dust: 330n }
    }
  },
}))

import { requestCarrierArkadeSwap } from '../../lib/carrierRfq'

const senderKey = 'a'.repeat(64)
const assetId = 'b'.repeat(64) + '0000'
const taxiKey = 'c'.repeat(64)
const echo = () => ({
  mode: 'recycle_receiver',
  quote_id: 'quote-1',
  taxi_url: 'https://taxi.example',
  taxi_key: taxiKey,
  physical_sats: '330',
  loan_sats: '330',
  receipt_sats: '0',
  service_fare_sats: '0',
  priced_sats: '0',
  expires_at: 1500,
})

afterEach(() => {
  vi.useRealTimers()
  derive.mockReset()
})

const negotiate = (changes: Record<string, unknown> = {}, advanceTime = false, carrierSats?: number) => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  const quote = {
    valid_until: 1400,
    profile: { carrier: { ...echo(), ...changes } },
    ...(carrierSats === undefined ? {} : { carrier_sats: carrierSats }),
  } as unknown as RfqQuote
  const requestQuote = vi.fn<RfqTransport['requestQuote']>().mockResolvedValue(quote)
  const transport = { requestQuote, status: vi.fn(), close: vi.fn() } as unknown as RfqTransport
  derive.mockImplementation(async (_wallet, _url, wrapped: RfqTransport) => {
    await wrapped.requestQuote({ profile: { maker_public_key: senderKey } } as Parameters<
      RfqTransport['requestQuote']
    >[0])
    if (advanceTime) vi.setSystemTime(1_400_000)
    return { quote, offerHex: '00' }
  })
  const result = requestCarrierArkadeSwap({} as IWallet, 'https://ark.example', transport, {
    wantAsset: asset.AssetId.fromString(assetId),
    amount: 1n,
    carrier: {
      mode: 'recycleReceiver',
      quote: {
        quoteId: 'quote-1',
        receiveAddress: 'tark1receiver',
        senderKey,
        assetId,
        physicalSats: 330n,
        loanSats: 330n,
        expiresAt: 1600,
      },
      taxi: { url: 'https://taxi.example', operatorKey: taxiKey },
    },
  })
  return { result, requestQuote }
}

it('adds the carrier request and returns verified whole-dust terms', async () => {
  const { result, requestQuote } = negotiate()
  expect((await result).carrier).toMatchObject({ mode: 'recycle_receiver', physicalSats: 330n, loanSats: 330n })
  expect(requestQuote.mock.calls[0][0]).toMatchObject({
    profile: {
      carrier: { mode: 'recycle_receiver', quote_id: 'quote-1', taxi_url: 'https://taxi.example', taxi_key: taxiKey },
    },
  })
})

it.each([
  { quote_id: 'other' },
  { taxi_url: 'https://other.example' },
  { taxi_key: 'd'.repeat(64) },
  { physical_sats: '329', loan_sats: '329' },
  { loan_sats: '329' },
  { receipt_sats: '1' },
  { service_fare_sats: '1' },
  { priced_sats: '1' },
  { loan_sats: '0330' },
  { expires_at: 1399 },
  { unknown: true },
])('refuses substituted or inconsistent carrier terms %j', async (changes) => {
  await expect(negotiate(changes).result).rejects.toThrow()
})

it('refuses top-level carrier sats on receiver-paid terms', async () => {
  await expect(negotiate({}, false, 330).result).rejects.toThrow('no carrier_sats')
})

it('refuses terms that expire while the SDK derives the offer', async () => {
  await expect(negotiate({}, true).result).rejects.toThrow('lapsed during derivation')
})

it('keeps a purchased carrier in the SDK funding quote', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
  const quote = {
    valid_until: 1400,
    carrier_sats: 330,
    profile: {
      carrier: {
        mode: 'purchase',
        physical_sats: '330',
        loan_sats: '0',
        receipt_sats: '0',
        service_fare_sats: '0',
        priced_sats: '330',
        expires_at: 1500,
      },
    },
  } as unknown as RfqQuote
  const transport = {
    requestQuote: vi.fn().mockResolvedValue(quote),
    status: vi.fn(),
    close: vi.fn(),
  } as unknown as RfqTransport
  derive.mockImplementation(async (_wallet, _url, wrapped: RfqTransport) => {
    await wrapped.requestQuote({ profile: { maker_public_key: senderKey } } as Parameters<
      RfqTransport['requestQuote']
    >[0])
    return { quote, offerHex: '00' }
  })
  const request = () =>
    requestCarrierArkadeSwap({} as IWallet, 'https://ark.example', transport, {
      wantAsset: asset.AssetId.fromString(assetId),
      amount: 1n,
      carrier: { mode: 'purchase' },
    })
  expect((await request()).carrier).toMatchObject({ mode: 'purchase', loanSats: 0n, pricedSats: 330n })
  quote.carrier_sats = 329
  await expect(request()).rejects.toThrow('differs from top-level carrier_sats')
})
