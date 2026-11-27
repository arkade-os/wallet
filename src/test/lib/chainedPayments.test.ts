import { asset, type ServiceWorkerWallet } from '@arkade-os/sdk'
import { arkadeAsset, btcOn, type OfferSwapRecord, type Quote } from '@arkade-os/swap'
import { toAtomicDecimal } from '@arkade-os/swap/advanced'
import { encodeOffer } from '@arkade-os/swap/protocol'
import { hex } from '@scure/base'
import { describe, expect, it, vi } from 'vitest'
import {
  assertConversionQuote,
  conversionQuoteInput,
  conversionStatus,
  findConversionPayout,
  selectConversionInputs,
} from '../../lib/chainedPayments'
import { lookupLightningPaymentKey, paymentAttemptKey } from '../../lib/paymentQuotes'
import fixtures from '../fixtures.json'

const network = 'bitcoin'
const assetId = `${'11'.repeat(32)}0000`
const token = arkadeAsset(network, asset.AssetId.fromString(assetId))
const btc = btcOn('arkade', network)
const sats = 25_000n
const quote = (): Quote => ({
  id: 'conversion',
  route: {
    give: { corridor: 'arkade', asset: token, instrument: { kind: 'wallet' } },
    take: { corridor: 'arkade', asset: btc, instrument: { kind: 'wallet' } },
  },
  give: { asset: token, amount: 100n },
  take: { asset: btc, amount: sats },
  carrierSats: 330n,
  expiresAt: Math.floor(Date.now() / 1000) + 60,
  market: { kind: 'restored', backend: 'rfq' },
  fee: { asset: btc, amount: 100n },
})

const attempt = {
  quoteId: 'conversion',
  swapId: 'offer:conversion',
  guarded: true as const,
  chain: { lightningQuoteId: 'lightning', sats },
}

const receiverPkScript = `5120${'ee'.repeat(32)}`
const filled = {
  id: attempt.quoteId,
  family: 'offer',
  status: 'fulfilled',
  route: quote().route,
  take: { asset: btc, amount: String(sats) },
  fundingTxid: 'deposit',
  spentTxid: 'fill',
  binding: { receiverPkScript },
} as OfferSwapRecord

describe('asset-funded Lightning route', () => {
  it('requests the precise BTC debit and requires a live firm quote paying it into this wallet', () => {
    expect(conversionQuoteInput(assetId, sats, network)).toEqual({
      give: token,
      take: btc,
      amount: sats,
      amountOn: 'take',
    })
    expect(() => assertConversionQuote(quote(), assetId, sats, network, 330n)).not.toThrow()
    expect(() => assertConversionQuote(quote(), assetId, sats + 1n, network, 330n)).toThrow('required Bitcoin')
    expect(() => assertConversionQuote(quote(), assetId, sats, network, 331n)).toThrow('required Bitcoin')
    expect(() => assertConversionQuote({ ...quote(), carrierSats: undefined }, assetId, sats, network, 330n)).toThrow(
      'required Bitcoin',
    )
    expect(() => assertConversionQuote({ ...quote(), expiresAt: 0 }, assetId, sats, network, 330n)).toThrow('expired')
    const external: Quote = {
      ...quote(),
      route: {
        ...quote().route,
        take: { corridor: 'arkade', asset: btc, instrument: { kind: 'address', address: 'ark' } },
      },
    }
    expect(() => assertConversionQuote(external, assetId, sats, network, 330n)).toThrow('this wallet')
  })

  it('reads the same invoice key after expiry without enabling funding', () => {
    const request = { kind: 'lightning', invoice: fixtures.lib.bolt11.invoice } as const
    const now = vi.spyOn(Date, 'now').mockReturnValue(1734606756000)
    try {
      const key = paymentAttemptKey(request, network, 'wallet')
      now.mockReturnValue(2000000000000)
      expect(lookupLightningPaymentKey(request, network, 'wallet')).toBe(key)
      expect(() => paymentAttemptKey(request, network, 'wallet')).toThrow('expired')
    } finally {
      now.mockRestore()
    }
  })

  it('retains an ambiguous attempt and distinguishes settled BTC from recovery and returned assets', () => {
    expect(conversionStatus(attempt, undefined)).toMatchObject({ phase: 'converting' })
    expect(conversionStatus(attempt, undefined, true)).toBeUndefined()
    expect(conversionStatus({ ...attempt, recordSaved: true }, undefined, true)).toMatchObject({ phase: 'converting' })
    expect(conversionStatus(attempt, { ...filled, spentTxid: undefined })).toMatchObject({ phase: 'converting' })
    expect(conversionStatus(attempt, { ...filled, take: { asset: btc, amount: toAtomicDecimal(42n) } })).toMatchObject({
      phase: 'converting',
    })
    expect(conversionStatus(attempt, { ...filled, status: 'recoverable' })).toMatchObject({ phase: 'recovery' })
    expect(conversionStatus(attempt, { ...filled, status: 'cancelled' })).toMatchObject({ phase: 'returned' })
    expect(conversionStatus(attempt, filled)).toEqual({ phase: 'credited', swapId: attempt.swapId, sats })
  })

  it('identifies only spendable, asset-free BTC at the committed output script in the fill', async () => {
    type Coin = Awaited<ReturnType<ServiceWorkerWallet['getSpendableVtxos']>>[number]
    const credited = { txid: 'fill', vout: 2, script: receiverPkScript, value: Number(sats) } as Coin
    const getSpendableVtxos = vi
      .fn()
      .mockResolvedValue([
        { ...credited, txid: 'unrelated-btc' },
        { ...credited, script: 'other-script' },
        { ...credited, value: Number(sats) + 1 },
        { ...credited, assets: [{ assetId, amount: 1n }] },
        credited,
      ])
    const wallet = { getSpendableVtxos }
    await expect(findConversionPayout(wallet, filled, sats)).resolves.toBe(credited)
    expect(getSpendableVtxos).toHaveBeenCalledWith({
      withRecoverable: false,
      genericallySpendableOnly: true,
      requireSynced: true,
    })
    getSpendableVtxos.mockResolvedValue([{ ...credited, txid: 'elsewhere' }])
    await expect(findConversionPayout(wallet, filled, sats)).resolves.toBeUndefined()
  })

  it('reads the committed output script from an offer recorded before bindings', async () => {
    const offerHex = hex.encode(
      encodeOffer({
        swapPkScript: hex.decode(`5120${'dd'.repeat(32)}`),
        makerPkScript: hex.decode(receiverPkScript),
        makerPublicKey: new Uint8Array(32).fill(1),
        emulatorPubkey: new Uint8Array(32).fill(2),
        wantAmount: sats,
        offerAsset: asset.AssetId.fromString(assetId),
      }),
    )
    const credited = { txid: 'fill', vout: 2, script: receiverPkScript, value: Number(sats) }
    const wallet = {
      getSpendableVtxos: vi.fn().mockResolvedValue([{ ...credited, script: 'other-script' }, credited]),
    }
    await expect(findConversionPayout(wallet, { ...filled, binding: undefined, offerHex }, sats)).resolves.toBe(
      credited,
    )
  })

  it('preflights carrier and asset change before recording the conversion', async () => {
    const exact = { txid: 'asset-coin', vout: 0, value: 330, assets: [{ assetId, amount: 100n }] }
    const partial = { ...exact, assets: [{ assetId, amount: 101n }] }
    const extra = { txid: 'bitcoin-coin', vout: 0, value: 500 }
    const wallet = { getSpendableVtxos: vi.fn() }
    const select = () => selectConversionInputs(wallet, assetId, 100n, 330n, 330n, 400n)
    wallet.getSpendableVtxos.mockResolvedValue([exact])
    await expect(select()).resolves.toEqual([exact])
    wallet.getSpendableVtxos.mockResolvedValue([partial])
    await expect(select()).rejects.toThrow('needs more BTC')
    wallet.getSpendableVtxos.mockResolvedValue([partial, extra])
    await expect(select()).resolves.toEqual([partial, expect.objectContaining(extra)])
  })

  it('uses the BTC-only change minimum when the selected asset leaves no remainder', async () => {
    const assetCoin = { txid: 'asset-coin', vout: 0, value: 330, assets: [{ assetId, amount: 100n }] }
    const plainCoin = { txid: 'bitcoin-coin', vout: 0, value: 350 }
    const wallet = { getSpendableVtxos: vi.fn().mockResolvedValue([assetCoin, plainCoin]) }
    await expect(selectConversionInputs(wallet, assetId, 100n, 500n, 330n, 100n)).resolves.toEqual([
      assetCoin,
      expect.objectContaining(plainCoin),
    ])
  })

  it('rejects supplemental funding targets above the safe integer range', async () => {
    const coin = { txid: 'asset-coin', vout: 0, value: 330, assets: [{ assetId, amount: 101n }] }
    const wallet = { getSpendableVtxos: vi.fn().mockResolvedValue([coin]) }
    const carrier = BigInt(Number.MAX_SAFE_INTEGER)
    await expect(selectConversionInputs(wallet, assetId, 100n, carrier, 330n, 400n)).rejects.toThrow(
      'change funding amount is too large',
    )
  })
})
