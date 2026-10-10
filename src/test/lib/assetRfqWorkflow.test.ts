import { expect, it, vi } from 'vitest'
import type { ExtendedVirtualCoin, IWallet } from '@arkade-os/sdk'
import { SwapRefusal, type AssetSwap, type AssetSwapRepository, type RfqTransport } from '@arkade-os/swap'
import { payAssetRequest, type AssetPaymentRequest, type AssetRfqSendDeps } from '../../lib/assetRfqWorkflow'

const receiverTaxi = vi.hoisted(() => ({
  choice: {
    mode: 'recycleReceiver',
    quote: { quoteId: 'q1' },
    taxi: { url: 'https://taxi.example', operatorKey: 'b'.repeat(64) },
  },
  inputExpiryFloor: { kind: 'time', value: 0n },
}))
vi.mock('@arkade-taxi/client/wallet', async (original) => ({
  ...(await original<typeof import('@arkade-taxi/client/wallet')>()),
  probeReceiverTaxi: async () => ({ ok: true, info: {} }),
}))
vi.mock('../../lib/receiverPaidCarrier', () => ({ receiverPaidCarrier: async () => receiverTaxi }))

type Request = Parameters<AssetRfqSendDeps['requestArkadeSwap']>[3]

const req: AssetPaymentRequest = {
  arkAddress: 'tark1receiver',
  assetId: 'd'.repeat(64) + '0000',
  amount: 5n,
}
const negotiated = {
  rfqId: 'e'.repeat(64),
  offerHex: '00',
  fundAmount: 1_000n,
  quote: { valid_until: Math.floor(Date.now() / 1000) + 600 },
} as unknown as Awaited<ReturnType<AssetRfqSendDeps['requestArkadeSwap']>>
const funded = { id: 'funded' } as unknown as AssetSwap
const schemaRefusal = () => new SwapRefusal('unsupported_payload', negotiated.rfqId)

const solver = (...answers: (Error | undefined)[]) => {
  const asked: Request[] = []
  const onError = vi.fn()
  const deps: AssetRfqSendDeps = {
    wallet: {
      identity: { xOnlyPublicKey: async () => new Uint8Array(32) },
    } as unknown as IWallet,
    arkServerUrl: 'http://ark.example',
    arkade: {
      serverKey: new Uint8Array(32),
      emulatorKey: new Uint8Array(32),
      hrp: 'tark',
      dust: 330n,
      vtxoMinAmount: 1n,
      locktimeDomain: 'time',
      clock: async () => BigInt(Math.floor(Date.now() / 1000)),
    },
    solvers: [{ solverPubkey: 'a'.repeat(64), transports: { nostr: { relays: ['wss://r'] } } }],
    ui: { confirmPayment: async () => true },
    fetch: () => Promise.reject(new Error('offline')),
    pageProtocol: 'https:',
    repository: {} as AssetSwapRepository,
    requestArkadeSwap: async (_wallet, _url, _transport, request) => {
      const answer = answers[asked.push(request) - 1]
      if (answer) throw answer
      return negotiated
    },
    fundOffer: (async () => funded) as unknown as AssetRfqSendDeps['fundOffer'],
    unreservedCoins: async () => [
      {
        txid: 'c'.repeat(64),
        vout: 0,
        value: 10_000,
        expiresAt: new Date(Date.now() + 86_400_000),
      } as unknown as ExtendedVirtualCoin,
    ],
    withRfqTransport: (_rendezvous, negotiate) => negotiate({} as RfqTransport),
    onError,
  }
  return { deps, asked, onError }
}

it('asks a solver that refuses the carrier field again without one', async () => {
  const { deps, asked } = solver(schemaRefusal())
  await expect(payAssetRequest(req, deps)).resolves.toBe(funded)
  expect(asked.map((request) => request.carrier)).toEqual([{ mode: 'purchase' }, undefined])
  expect(asked[1]).not.toHaveProperty('carrier')
  expect(asked[1].receiveAddress).toBe(req.arkAddress)
})

it('keeps the purchase when the solver prices it', async () => {
  const { deps, asked } = solver()
  await expect(payAssetRequest(req, deps)).resolves.toBe(funded)
  expect(asked.map((request) => request.carrier)).toEqual([{ mode: 'purchase' }])
})

it.each([
  ['another reason', new SwapRefusal('pricing_unavailable')],
  ['a named field', new SwapRefusal('unsupported_payload', '', { errorCode: 'invalid_amount' })],
])('does not drop the carrier for a refusal citing %s', async (_, refusal) => {
  const { deps, asked } = solver(refusal)
  await expect(payAssetRequest(req, deps)).rejects.toBe(refusal)
  expect(asked).toHaveLength(1)
})

it('still drops a refused Taxi instead of asking it without a carrier', async () => {
  const { deps, asked, onError } = solver(schemaRefusal(), schemaRefusal())
  const viaTaxi = { ...req, taxi: { url: 'https://taxi.example' } }
  await expect(payAssetRequest(viaTaxi, deps)).resolves.toBe(funded)
  expect(asked.map((request) => request.carrier?.mode)).toEqual(['recycleReceiver', 'purchase', undefined])
  expect(onError).toHaveBeenCalledWith(expect.any(SwapRefusal), "dropped the receiver's Taxi (unsupported_payload)")
})
