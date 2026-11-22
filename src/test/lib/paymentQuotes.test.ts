import { asset } from '@arkade-os/sdk'
import { arkadeAsset, btcOn, type Quote } from '@arkade-os/swap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertAssetPaymentQuote,
  assertOpenPaymentQuote,
  assetPaymentQuoteInput,
  openPaymentQuoteInput,
  paymentAttemptKey,
  paymentQuoteExpiry,
  type PaymentQuoteRequest,
} from '../../lib/paymentQuotes'
import fixtures from '../fixtures.json'

const { invoice, amountSats, paymentHash } = fixtures.lib.bolt11
const now = 1734606756
const network = 'bitcoin'
const btc = btcOn('arkade', network)
const lightning = btcOn('bolt11', network)
const assetId = '12'.repeat(32) + '0000'
const token = arkadeAsset(network, asset.AssetId.fromString(assetId))
const invoiceRequest = { kind: 'lightning', invoice, amount: amountSats } as const
const assetRequest = { kind: 'asset', assetId, address: 'ark1recipient', amount: 20n } as const

const lnQuote = (): Quote => ({
  id: 'lnquote',
  route: {
    give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
    take: {
      corridor: 'lightning',
      asset: lightning,
      instrument: { kind: 'invoice', bolt11: invoice, paymentHash, expiresAt: now + 600 },
    },
  },
  give: { asset: btc, amount: BigInt(amountSats + 5) },
  take: { asset: lightning, amount: BigInt(amountSats) },
  expiresAt: now + 60,
  market: { kind: 'restored', backend: 'rfq' },
  fee: { asset: btc, amount: 5n },
})

const assetQuote = (): Quote => ({
  ...lnQuote(),
  id: 'assetquote',
  route: {
    give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
    take: { corridor: 'arkade', asset: token, instrument: { kind: 'address', address: assetRequest.address } },
  },
  take: { asset: token, amount: assetRequest.amount },
  assetPayment: { receiveAddress: assetRequest.address, validUntil: now + 20 },
})

describe('payment quotes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now * 1000)
  })

  afterEach(() => vi.useRealTimers())

  it('takes the amount from the Lightning invoice and refuses mismatched amount or network before quoting', () => {
    expect(openPaymentQuoteInput(invoiceRequest, network)).toEqual({ to: invoice })
    expect(() => openPaymentQuoteInput({ ...invoiceRequest, amount: amountSats + 1 }, network)).toThrow(
      'does not match the Lightning invoice',
    )
    expect(() => openPaymentQuoteInput(invoiceRequest, 'regtest')).toThrow('invoice is not for regtest')
  })

  it('requires the firm Lightning quote to pay the reviewed invoice and amount', () => {
    const quote = lnQuote()
    expect(() => assertOpenPaymentQuote(quote, invoiceRequest, network)).not.toThrow()
    expect(() =>
      assertOpenPaymentQuote(
        { ...quote, take: { asset: lightning, amount: BigInt(amountSats - 1) } },
        invoiceRequest,
        network,
      ),
    ).toThrow('does not match the recipient and amount')
    const rerouted: Quote = {
      ...quote,
      route: {
        give: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
        take: {
          corridor: 'lightning',
          asset: lightning,
          instrument: { kind: 'invoice', bolt11: invoice, paymentHash: '00'.repeat(32), expiresAt: now + 600 },
        },
      },
    }
    expect(() => assertOpenPaymentQuote(rerouted, invoiceRequest, network)).toThrow(
      'does not match the recipient and amount',
    )
  })

  it('quotes exact output to a direct asset recipient and honors both quote deadlines', () => {
    expect(assetPaymentQuoteInput(assetRequest, network)).toEqual({
      give: btc,
      take: token,
      amount: assetRequest.amount,
      amountOn: 'take',
      assetPayment: { receiveAddress: assetRequest.address },
    })
    const quote = assetQuote()
    expect(() => assertAssetPaymentQuote(quote, assetRequest, network)).not.toThrow()
    expect(() => assertAssetPaymentQuote(quote, { ...assetRequest, address: 'ark1different' }, network)).toThrow(
      'does not deliver the requested asset amount to the recipient',
    )
    expect(paymentQuoteExpiry(quote)).toBe(now + 20)
    vi.setSystemTime((now + 20) * 1000)
    expect(() => assertAssetPaymentQuote(quote, assetRequest, network)).toThrow('This quote has expired')
  })

  it('fences duplicate invoice attempts across reviews and scopes reusable destinations to each review', () => {
    const key = (request: PaymentQuoteRequest, reviewId: string, walletPubkey = 'wallet') =>
      paymentAttemptKey(request, network, walletPubkey, reviewId)
    expect(key(invoiceRequest, 'first')).toBe(key(invoiceRequest, 'second'))
    expect(key(invoiceRequest, 'first')).not.toBe(key(invoiceRequest, 'first', 'other-wallet'))
    expect(key(assetRequest, 'first')).not.toBe(key(assetRequest, 'second'))
    expect(key(assetRequest, 'first')).not.toBe(key({ ...assetRequest, amount: 21n }, 'first'))
    expect(key(assetRequest, 'first')).not.toBe(key({ ...assetRequest, address: 'ark1different' }, 'first'))
  })
})
