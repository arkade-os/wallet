import { ArkAddress, type ExtendedVirtualCoin } from '@arkade-os/sdk'
import { btcOn, type AssetId, type CorridorSwapRecord, type OfferSwapRecord, type Quote } from '@arkade-os/swap'
import { recordEndpoint, recordLeg } from '@arkade-os/swap/advanced'
import { hex } from '@scure/base'
import { describe, expect, it, vi } from 'vitest'
import { decodeInvoice } from '../../lib/bolt11'
import {
  findSwapRoutePayout,
  routeFundingInvoice,
  routeLegStatus,
  selectRouteBitcoinInputs,
} from '../../lib/swapRouteExecution'
import fixtures from '../fixtures.json'

const bitcoin = btcOn('arkade', 'bitcoin')
const lightning = btcOn('bolt11', 'bitcoin')
const assetId = `${'11'.repeat(32)}0000`
const otherId = `${'22'.repeat(32)}0000`
const token: AssetId<'arkade'> = `arkade:bitcoin/asset:${assetId}`
const { invoice } = fixtures.lib.bolt11
const { timestamp, expiresAt, amountSats, paymentHash } = decodeInvoice(invoice)
const { serverPubKey, vtxoTaprootKey } = fixtures.lib.address.ark[0]
const address = new ArkAddress(hex.decode(serverPubKey), hex.decode(vtxoTaprootKey), 'ark')
const script = hex.encode(address.pkScript)
const walletInstrument = { kind: 'wallet' } as const
const bridge = 2_000n
const receivingQuote: Quote = {
  id: 'incoming-lightning',
  route: {
    give: {
      corridor: 'lightning',
      asset: lightning,
      instrument: { kind: 'invoice', bolt11: invoice, amount: BigInt(amountSats), paymentHash, expiresAt },
    },
    take: { corridor: 'arkade', asset: bitcoin, instrument: walletInstrument },
  },
  give: { asset: lightning, amount: BigInt(amountSats) },
  take: { asset: bitcoin, amount: bridge },
  fee: { asset: lightning, amount: BigInt(amountSats) - bridge },
  market: { kind: 'restored', backend: 'rfq' },
  expiresAt,
  artifact: { kind: 'invoice', bolt11: invoice },
}

function assetQuote(from: AssetId<'arkade'>, to: AssetId<'arkade'>, give: bigint, take: bigint): Quote {
  return {
    id: `${from}/${to}`,
    route: {
      give: { corridor: 'arkade', asset: from, instrument: walletInstrument },
      take: { corridor: 'arkade', asset: to, instrument: walletInstrument },
    },
    give: { asset: from, amount: give },
    take: { asset: to, amount: take },
    fee: { asset: to, amount: 1n },
    market: { kind: 'restored', backend: 'rfq' },
    expiresAt,
  }
}

const receiveAsset = assetQuote(bitcoin, token, bridge, 20n)
const sellAsset = { ...assetQuote(token, bitcoin, 20n, bridge), carrierSats: 330n }

const recordTerms = (quote: Quote) => ({
  id: quote.id,
  route: { give: recordEndpoint(quote.route.give), take: recordEndpoint(quote.route.take) },
  give: recordLeg(quote.give),
  take: recordLeg(quote.take),
  fee: recordLeg(quote.fee),
  market: quote.market,
  expiresAt: quote.expiresAt,
  createdAt: timestamp,
  updatedAt: timestamp,
})

const offerRecord = (quote: Quote = sellAsset): OfferSwapRecord => ({
  ...recordTerms(quote),
  family: 'offer',
  status: 'fulfilled',
  swapAddress: 'test-lockup',
  swapPkScript: 'test-lockup-script',
  fundingTxid: 'offer-deposit',
  spentTxid: 'offer-fill',
  binding: {
    version: 'asset-swap-directed-nonce',
    receiverPkScript: script,
    amount: String(quote.take.amount),
    userPublicKey: vtxoTaprootKey,
    serverPublicKey: serverPubKey,
    emulatorPublicKey: serverPubKey,
  },
})

const incoming: CorridorSwapRecord = {
  ...recordTerms(receivingQuote),
  family: 'rfq',
  state: 'pending',
  kind: 'lightning_receive',
  rfqId: 'receive-rfq',
  lockupAddress: 'test-lockup',
  lockupPkScript: 'test-lockup-script',
  lock: { hash: paymentHash },
  refundLocktime: expiresAt + 600,
  artifact: { kind: 'invoice', bolt11: invoice },
  profile: { payoutAddress: address.encode(), expectedAmount: Number(bridge) },
}

const coin = (txid: string, value: number, rest: Partial<ExtendedVirtualCoin> = {}) =>
  ({ txid, vout: 1, value, script, ...rest }) as ExtendedVirtualCoin

describe('generic swap route settlement', () => {
  it('distinguishes settlement, pending, refund, and pre-submit expiry from persistent records', () => {
    const filled = offerRecord()
    expect(routeLegStatus(filled)).toBe('settled')
    expect(routeLegStatus({ ...filled, spentTxid: undefined })).toBe('waiting')
    expect(routeLegStatus({ ...filled, fundingTxid: undefined })).toBe('waiting')
    expect(routeLegStatus({ ...filled, status: 'cancelled' })).toBe('returned')
    expect(routeLegStatus({ ...filled, status: 'cancelled', spentTxid: undefined })).toBe('waiting')
    expect(routeLegStatus({ ...filled, status: 'recoverable' })).toBe('recovery')
    expect(
      routeLegStatus({
        ...filled,
        status: 'cancelled',
        spentTxid: undefined,
        fundingTxid: undefined,
        fundingNotSubmitted: { reason: 'send_deadline', validUntil: expiresAt - 1 },
      }),
    ).toBe('expired')
    expect(routeLegStatus({ ...incoming, state: 'claimable' })).toBe('waiting')
    expect(routeLegStatus({ ...incoming, state: 'claimed' })).toBe('waiting')
    expect(routeLegStatus({ ...incoming, state: 'refunded' })).toBe('returned')
  })

  it('exposes only the original registered invoice while both the invoice and plan are current', () => {
    const plan = { id: 'route', quotes: [receivingQuote, receiveAsset], expiresAt: expiresAt - 20 }
    const clock = vi.spyOn(Date, 'now').mockReturnValue(timestamp * 1_000)
    expect(routeFundingInvoice(incoming, plan)).toEqual({ bolt11: invoice, expiresAt: plan.expiresAt })
    expect(routeFundingInvoice(incoming, { ...plan, expiresAt: expiresAt + 20 })).toEqual({
      bolt11: invoice,
      expiresAt,
    })
    expect(routeFundingInvoice({ ...incoming, id: 'other-quote' }, plan)).toBeUndefined()
    expect(routeFundingInvoice({ ...incoming, state: 'refunded' }, plan)).toBeUndefined()
    expect(routeFundingInvoice({ ...incoming, lock: { hash: 'aa'.repeat(32) } }, plan)).toBeUndefined()
    expect(
      routeFundingInvoice({ ...incoming, artifact: { kind: 'invoice', bolt11: invoice.toUpperCase() } }, plan),
    ).toBeUndefined()
    const wrongAmount = { ...receivingQuote, give: { asset: lightning, amount: BigInt(amountSats) + 1n } }
    expect(routeFundingInvoice(incoming, { ...plan, quotes: [wrongAmount, receiveAsset] })).toBeUndefined()
    clock.mockReturnValue(plan.expiresAt * 1_000)
    expect(routeFundingInvoice(incoming, plan)).toBeUndefined()
    clock.mockReturnValue(expiresAt * 1_000)
    expect(routeFundingInvoice(incoming, { ...plan, expiresAt: expiresAt + 20 })).toBeUndefined()
  })

  it('pins only the confirmed offer fill at the committed wallet script and amount', async () => {
    const filled = offerRecord()
    const credited = coin('offer-fill', Number(bridge))
    const getSpendableVtxos = vi
      .fn()
      .mockResolvedValue([
        coin('old-payout', Number(bridge)),
        { ...credited, script: 'another-script' },
        { ...credited, assets: [{ assetId, amount: 1n }] },
        { ...credited, value: Number(bridge) - 1 },
        credited,
      ])
    const wallet = { getSpendableVtxos }
    await expect(findSwapRoutePayout(wallet, filled, receiveAsset, 500n)).resolves.toBe(credited)
    expect(getSpendableVtxos).toHaveBeenCalledExactlyOnceWith({
      withRecoverable: false,
      genericallySpendableOnly: true,
      requireSynced: true,
    })
    getSpendableVtxos.mockClear()
    await expect(
      findSwapRoutePayout(wallet, { ...filled, status: 'pending' }, receiveAsset, 500n),
    ).resolves.toBeUndefined()
    await expect(
      findSwapRoutePayout(wallet, { ...filled, status: 'cancelled' }, receiveAsset, 500n),
    ).resolves.toBeUndefined()
    const wrongWallet: OfferSwapRecord = {
      ...filled,
      route: { ...filled.route, take: { ...filled.route.take, instrument: { kind: 'address', address: 'other' } } },
    }
    await expect(findSwapRoutePayout(wallet, wrongWallet, receiveAsset, 500n)).resolves.toBeUndefined()
    const externalSource: Quote = {
      ...receiveAsset,
      route: {
        give: { corridor: 'arkade', asset: bitcoin, instrument: { kind: 'address', address: 'other' } },
        take: { corridor: 'arkade', asset: token, instrument: walletInstrument },
      },
    }
    await expect(findSwapRoutePayout(wallet, filled, externalSource, 500n)).resolves.toBeUndefined()
    await expect(
      findSwapRoutePayout(wallet, filled, assetQuote(bitcoin, token, bridge + 1n, 20n), 500n),
    ).resolves.toBeUndefined()
    expect(getSpendableVtxos).not.toHaveBeenCalled()
  })

  it('requires a settled Lightning claim and leaves change only at a valid amount', async () => {
    const settled: CorridorSwapRecord = {
      ...incoming,
      state: 'settled',
      profile: { ...incoming.profile, claimTxid: 'lightning-claim' },
    }
    const shortChange = coin('lightning-claim', Number(bridge) + 499)
    const validChange = coin('lightning-claim', Number(bridge) + 500, { vout: 2 })
    const getSpendableVtxos = vi.fn().mockResolvedValue([coin('prior-claim', Number(bridge)), shortChange])
    const wallet = { getSpendableVtxos }
    await expect(findSwapRoutePayout(wallet, settled, receiveAsset, 500n)).resolves.toBeUndefined()
    getSpendableVtxos.mockResolvedValue([validChange])
    await expect(findSwapRoutePayout(wallet, settled, receiveAsset, 500n)).resolves.toBe(validChange)
    getSpendableVtxos.mockClear()
    await expect(
      findSwapRoutePayout(wallet, { ...settled, profile: incoming.profile }, receiveAsset, 500n),
    ).resolves.toBeUndefined()
    await expect(
      findSwapRoutePayout(wallet, { ...settled, state: 'claimed' }, receiveAsset, 500n),
    ).resolves.toBeUndefined()
    await expect(
      findSwapRoutePayout(wallet, { ...settled, state: 'refunded' }, receiveAsset, 500n),
    ).resolves.toBeUndefined()
    expect(getSpendableVtxos).not.toHaveBeenCalled()
  })

  it('requires the exact intermediate asset and carrier instead of a similarly valued output', async () => {
    const filled = offerRecord(receiveAsset)
    const exact = coin('offer-fill', 330, { assets: [{ assetId, amount: 20n }] })
    const getSpendableVtxos = vi
      .fn()
      .mockResolvedValue([
        coin('offer-fill', 330),
        { ...exact, assets: [{ assetId: otherId, amount: 20n }] },
        { ...exact, assets: [{ assetId, amount: 21n }] },
        { ...exact, assets: [...exact.assets!, { assetId: otherId, amount: 1n }] },
        { ...exact, value: 329 },
        exact,
      ])
    await expect(findSwapRoutePayout({ getSpendableVtxos }, filled, sellAsset, 500n)).resolves.toBe(exact)
  })

  it('prioritizes a clean BTC input and rejects unspendable change', async () => {
    const exact = coin('clean', Number(bridge))
    const withAsset = coin('token', Number(bridge), { assets: [{ assetId, amount: 20n }] })
    const shortChange = coin('too-little-change', Number(bridge) + 499)
    const getSpendableVtxos = vi.fn().mockResolvedValue([withAsset, shortChange, exact])
    const wallet = { getSpendableVtxos }
    await expect(selectRouteBitcoinInputs(wallet, bridge, 500n)).resolves.toEqual([exact])
    getSpendableVtxos.mockResolvedValue([withAsset, shortChange])
    await expect(selectRouteBitcoinInputs(wallet, bridge, 500n)).rejects.toThrow()
  })
})
