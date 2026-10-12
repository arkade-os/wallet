import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExtendedVirtualCoin, IWallet } from '@arkade-os/sdk'
import { assetSwapIdOf, SwapRefusal, type Quote, type Swap } from '@arkade-os/swap'
import { PaymentDeclined, payAssetRequest, type AssetRfqSendDeps } from '../../lib/assetRfqWorkflow'

const taxi = vi.hoisted(() => ({
  probe: vi.fn(async () => ({ ok: true, info: {} })),
  receive: vi.fn(),
}))
vi.mock('@arkade-taxi/client/wallet', async (original) => ({
  ...(await original<typeof import('@arkade-taxi/client/wallet')>()),
  probeReceiverTaxi: taxi.probe,
  callerMinimum: async () => 1000n,
}))
vi.mock('../../lib/receiverPaidCarrier', () => ({ receiverPaidCarrier: taxi.receive }))

const request = { arkAddress: 'recipient', assetId: 'fa'.repeat(34), amount: 500n }
const quoted = (over: Partial<Quote> = {}): Quote =>
  ({
    id: 'quoted',
    expiresAt: Date.now() / 1000 + 600,
    give: { amount: 1000n },
    ...over,
  }) as Quote
const receivedAsset = `arkade:regtest/arkade:${request.assetId}` as const
const fundedAt = Math.floor(Date.now() / 1000)
const funded: Swap = {
  id: assetSwapIdOf('offer', 'funded'),
  family: 'offer',
  outcome: 'funded',
  route: {
    give: { corridor: 'arkade', asset: 'arkade:regtest/slip44:0', instrument: { kind: 'wallet' } },
    take: { corridor: 'arkade', asset: receivedAsset, instrument: { kind: 'address', address: request.arkAddress } },
  },
  give: { asset: 'arkade:regtest/slip44:0', amount: 1000n },
  take: { asset: receivedAsset, amount: request.amount },
  fee: { asset: 'arkade:regtest/slip44:0', amount: 0n },
  market: { kind: 'restored', backend: 'rfq' },
  expiresAt: fundedAt + 600,
  fundingTxid: 'funding-txid',
  createdAt: fundedAt,
  updatedAt: fundedAt,
}
const setup = () => {
  taxi.probe.mockClear()
  taxi.receive.mockReset().mockImplementation(async (_taxi, _info, _ctx, payer) => ({
    choice: {
      mode: 'recycleReceiver',
      quote: { quoteId: 'taxi-quote' },
      taxi: { url: 'https://taxi.example', operatorKey: 'ab'.repeat(32) },
    },
    inputExpiryFloor: { kind: 'time', value: payer.fundingExpiry },
  }))
  const quoteAssetPayment = vi.fn<AssetRfqSendDeps['quoteAssetPayment']>(async () => quoted())
  const acceptAssetPayment = vi.fn<AssetRfqSendDeps['acceptAssetPayment']>(async () => funded)
  const confirmPayment = vi.fn<AssetRfqSendDeps['ui']['confirmPayment']>(async () => true)
  const coins = [{ txid: 'coin', vout: 0, value: 10000, expiresAt: new Date(2000_000) }] as ExtendedVirtualCoin[]
  const deps: AssetRfqSendDeps = {
    wallet: { identity: { xOnlyPublicKey: async () => new Uint8Array(32) } } as IWallet,
    arkade: {
      serverKey: new Uint8Array(32),
      emulatorKey: new Uint8Array(32),
      hrp: 'tark',
      dust: 330n,
      vtxoMinAmount: 1n,
      locktimeDomain: 'time',
      clock: async () => 0n,
    },
    fetch: vi.fn(),
    pageProtocol: 'https:',
    ui: { confirmPayment },
    unreservedCoins: async () => coins,
    quoteAssetPayment,
    acceptAssetPayment,
    onError: vi.fn(),
  }
  return { deps, quoteAssetPayment, acceptAssetPayment, confirmPayment, coins }
}
afterEach(() => vi.useRealTimers())

describe('native exact-out asset payment', () => {
  it('confirms the native quote and accepts that exact preparation once', async () => {
    const { deps, quoteAssetPayment, acceptAssetPayment, confirmPayment } = setup()
    const quote = quoted()
    quoteAssetPayment.mockResolvedValue(quote)
    await expect(payAssetRequest(request, deps)).resolves.toBe(funded)
    expect(quoteAssetPayment).toHaveBeenCalledWith(request, {
      receiveAddress: 'recipient',
      carrier: { mode: 'purchase' },
    })
    expect(confirmPayment).toHaveBeenCalledWith({ payAmountSats: 1000n, assetId: request.assetId, assetAmount: 500n })
    expect(acceptAssetPayment).toHaveBeenCalledOnce()
    expect(acceptAssetPayment.mock.calls[0][0]).toBe(quote)
  })
  it('never accepts a declined price', async () => {
    const { deps, confirmPayment, acceptAssetPayment } = setup()
    confirmPayment.mockResolvedValue(false)
    await expect(payAssetRequest(request, deps)).rejects.toBeInstanceOf(PaymentDeclined)
    expect(acceptAssetPayment).not.toHaveBeenCalled()
  })
  it('refreshes an expired durable funding deadline before any acceptance', async () => {
    const { deps, quoteAssetPayment, acceptAssetPayment, confirmPayment } = setup()
    const fresh = quoted()
    quoteAssetPayment
      .mockResolvedValueOnce(quoted({ assetPayment: { validUntil: 0 } } as Partial<Quote>))
      .mockResolvedValueOnce(fresh)
    await payAssetRequest(request, deps)
    expect(confirmPayment).toHaveBeenCalledTimes(2)
    expect(confirmPayment.mock.calls[1][0]).toMatchObject({ refreshed: true })
    expect(acceptAssetPayment).toHaveBeenCalledExactlyOnceWith(fresh)
  })
  it('never negotiates or accepts another route after ambiguous native acceptance', async () => {
    const { deps, quoteAssetPayment, acceptAssetPayment } = setup()
    const ambiguous = new Error('submitted but no response')
    acceptAssetPayment.mockRejectedValue(ambiguous)
    await expect(payAssetRequest(request, deps)).rejects.toBe(ambiguous)
    expect(quoteAssetPayment).toHaveBeenCalledOnce()
    expect(acceptAssetPayment).toHaveBeenCalledOnce()
  })
  it('retries a legacy schema refusal once without the purchase hint', async () => {
    const { deps, quoteAssetPayment } = setup()
    quoteAssetPayment.mockRejectedValueOnce(new SwapRefusal('unsupported_payload'))
    await payAssetRequest(request, deps)
    expect(quoteAssetPayment.mock.calls.map(([, payment]) => payment.carrier)).toEqual([
      { mode: 'purchase' },
      undefined,
    ])
  })
  it.each([
    new SwapRefusal('pricing_unavailable'),
    new SwapRefusal('unsupported_payload', '', { errorCode: 'invalid_amount' }),
  ])('preserves specific native refusals without a fallback', async (refusal) => {
    const { deps, quoteAssetPayment, acceptAssetPayment } = setup()
    quoteAssetPayment.mockRejectedValue(refusal)
    await expect(payAssetRequest(request, deps)).rejects.toBe(refusal)
    expect(quoteAssetPayment).toHaveBeenCalledOnce()
    expect(acceptAssetPayment).not.toHaveBeenCalled()
  })
  it('lowers an uncovered verified floor only once before purchasing carrier', async () => {
    const { deps, quoteAssetPayment, coins } = setup()
    coins[0].value = 100
    coins.push({ ...coins[0], txid: 'older', value: 5000, expiresAt: new Date(1500_000) })
    quoteAssetPayment
      .mockResolvedValueOnce(quoted())
      .mockResolvedValueOnce(quoted({ give: { amount: 10000n } } as Partial<Quote>))
    await payAssetRequest({ ...request, taxi: { url: 'https://taxi.example' } }, deps)
    expect(taxi.receive).toHaveBeenCalledTimes(2)
    expect(quoteAssetPayment.mock.calls.map(([, payment]) => payment.carrier?.mode)).toEqual([
      'recycleReceiver',
      'recycleReceiver',
      'purchase',
    ])
    expect(quoteAssetPayment.mock.calls[1][1].carrier).toMatchObject({
      inputExpiryFloor: { kind: 'time', value: 1500n },
    })
    expect(quoteAssetPayment.mock.calls[0][1]).not.toHaveProperty('receiveAddress')
  })
  it('does not advertise a floor for a coin with unknown or mixed expiry domains', async () => {
    const { deps, coins, quoteAssetPayment } = setup()
    coins[0].expiresAtHeight = 2000
    await payAssetRequest({ ...request, taxi: { url: 'https://taxi.example' } }, deps)
    expect(taxi.receive).not.toHaveBeenCalled()
    expect(quoteAssetPayment.mock.calls[0][1].carrier).toEqual({ mode: 'purchase' })
  })
  it('drops a Taxi after two confirmations lapse while retaining confirmation before funding', async () => {
    const { deps, quoteAssetPayment, confirmPayment, acceptAssetPayment } = setup()
    let confirmations = 0
    confirmPayment.mockImplementation(async () => {
      confirmations++
      vi.setSystemTime(Date.now() + 1000)
      return true
    })
    vi.useFakeTimers()
    quoteAssetPayment.mockImplementation(async () =>
      quoted({ assetPayment: { validUntil: Date.now() / 1000 + (confirmations < 2 ? 0.5 : 20) } } as Partial<Quote>),
    )
    await payAssetRequest({ ...request, taxi: { url: 'https://taxi.example' } }, deps)
    expect(quoteAssetPayment.mock.calls.map(([, payment]) => payment.carrier?.mode)).toEqual([
      'recycleReceiver',
      'recycleReceiver',
      'purchase',
    ])
    expect(confirmPayment).toHaveBeenCalledTimes(3)
    expect(acceptAssetPayment).toHaveBeenCalledOnce()
  })
})
