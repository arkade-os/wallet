import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import type { CovenantTransfer, SubscribeClaimsArgs } from '@arkade-taxi/client'
import {
  claimVerified,
  planReceiverClaim,
  watchReceiverClaims,
  type ClaimClient,
  type ClaimWatch,
  type RecyclePlan,
} from '../../lib/receiverClaims'
import { BOB, BOB_ADDRESS, BOB_PK_SCRIPT, assetFareClaim, coins, satsFareClaim } from './receiverClaimsFixtures'
import { INFO, KEYS, TAXI_URL } from './receiverTaxiFixtures'

const consoleError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/logs')>()),
  consoleError,
}))

describe('planReceiverClaim', () => {
  it('claims by merging an existing coin and shows the sats fare it costs', async () => {
    expect(await planReceiverClaim(satsFareClaim(7n), coins([1000n]))).toMatchObject({
      kind: 'recycle',
      feeSats: 7n,
      mergedSats: 993n,
    })
  })

  it('says a claim is impossible when the only coin covers dust but not the fare', async () => {
    // 334 clears dust (330) and fails only on the fare, so the threshold is what is tested.
    expect(await planReceiverClaim(satsFareClaim(7n), coins([334n]))).toMatchObject({
      kind: 'wait-for-reclaim',
      reason: 'no-coin-covers-the-fare',
    })
  })

  it('accepts the smallest coin that does cover it', async () => {
    expect((await planReceiverClaim(satsFareClaim(7n), coins([337n]))).kind).toBe('recycle')
  })

  it('shows an asset fare as units out of the delivery, not sats', async () => {
    expect(await planReceiverClaim(assetFareClaim(9n), coins([1000n]))).toMatchObject({
      kind: 'recycle',
      feeUnits: 9n,
      deliveredUnits: 491n,
    })
  })

  it('merges the smallest coin that covers the fare, and only a coin at the address the claim pays', () => {
    const [other] = coins([5000n], '5120' + 'ab'.repeat(32))
    const [big, small] = coins([2000n, 400n])
    const plan = planReceiverClaim(satsFareClaim(7n), [other, big, small])
    expect(plan).toMatchObject({ kind: 'recycle', mergedSats: 393n })
    expect((plan as RecyclePlan).coin).toBe(small)
  })

  it('leaves a delivery to return on its own when the asset fare would take all of it', () => {
    expect(planReceiverClaim(assetFareClaim(500n), coins([1000n]))).toMatchObject({
      kind: 'wait-for-reclaim',
      reason: 'fare-exceeds-delivery',
    })
  })
})

const TRANSFER = { transferId: 'tr-sats-7' } as unknown as CovenantTransfer
const TAXI = { network: 'regtest', url: TAXI_URL, operatorKey: KEYS.operator }
const TRUST = {
  serverKey: hex.decode(KEYS.server),
  emulatorKey: hex.decode(KEYS.emulator),
  vtxoMinAmount: 1n,
  hrp: 'tark',
}
const CONFIG = {
  arkdUrl: 'https://arkd.example',
  emulatorUrl: 'https://emulator.example',
  network: 'regtest',
  serverUnrollScript: 'ab',
}

const fakeTaxi = (over: Partial<Record<keyof ClaimClient, unknown>> = {}) => {
  const feed: { args?: SubscribeClaimsArgs } = {}
  const unsubscribe = vi.fn()
  const recycle = vi.fn<ClaimClient['recycle']>(async () => 'f'.repeat(64))
  const client = {
    info: vi.fn(async () => INFO),
    subscribeClaims: vi.fn((args: SubscribeClaimsArgs) => {
      feed.args = args
      return unsubscribe
    }),
    verifyIncomingClaim: vi.fn(async () => TRANSFER),
    recycle,
    ...over,
  }
  return { client: client as unknown as ClaimClient, recycle, feed, unsubscribe }
}

const watch = (client: ClaimClient, over: Partial<ClaimWatch> = {}) => {
  const offers: Parameters<ClaimWatch['onOffer']>[0][] = []
  const onGone = vi.fn()
  const stop = watchReceiverClaims({
    taxis: [TAXI],
    receiverAddress: BOB_ADDRESS,
    clientFor: () => client,
    trust: TRUST,
    spendConfig: async () => CONFIG,
    onOffer: (offer) => offers.push(offer),
    onGone,
    ...over,
  })
  return { offers, onGone, stop }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('watchReceiverClaims', () => {
  beforeEach(() => consoleError.mockClear())

  it("offers a claim only once it verifies against the running context's keys and the Taxi the wallet named", async () => {
    const { client, feed } = fakeTaxi()
    const { offers } = watch(client)
    expect(client.subscribeClaims).toHaveBeenCalledWith(expect.objectContaining({ receiverAddresses: [BOB_ADDRESS] }))
    feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(client.verifyIncomingClaim).toHaveBeenCalledWith(
      satsFareClaim(7n),
      expect.objectContaining({
        receiverAddress: BOB_ADDRESS,
        assetUnits: 500n,
        recoveryRecipient: 'receiver',
        claimMode: 'recycle',
      }),
      { ...TRUST, operatorKey: hex.decode(KEYS.operator) },
      CONFIG,
    )
    expect(offers).toHaveLength(1)
    expect(offers[0].transfer).toBe(TRANSFER)
  })

  it('never lets a claim that fails verification reach recycle, even when every offer is confirmed', async () => {
    const { client, recycle, feed } = fakeTaxi({
      verifyIncomingClaim: vi.fn(async () => {
        throw new Error('incoming covenant address mismatch')
      }),
    })
    const plan = planReceiverClaim(satsFareClaim(7n), coins([1000n])) as RecyclePlan
    const confirmed: unknown[] = []
    watch(client, {
      onOffer: (offer) => {
        confirmed.push(offer)
        void claimVerified(offer, plan, BOB)
      },
    })
    feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(recycle).not.toHaveBeenCalled()
    expect(confirmed).toEqual([])
    expect(consoleError).toHaveBeenCalledWith(expect.any(Error), expect.stringMatching(/failed verification/))
  })

  it('neither verifies nor claims a descriptor whose unclaimedMode this build does not know, and logs it', async () => {
    const { client, feed } = fakeTaxi()
    const { offers } = watch(client)
    const claim = satsFareClaim(7n)
    ;(claim.claim as { unclaimedMode?: string }).unclaimedMode = 'forfeit'
    feed.args!.onSnapshot({ claims: [claim] })
    await settle()
    expect(client.verifyIncomingClaim).not.toHaveBeenCalled()
    expect(offers).toEqual([])
    expect(consoleError).toHaveBeenCalledWith('forfeit', expect.stringMatching(/unclaimedMode/))
  })

  it('leaves alone a claim for another receiver, or under an operator key other than the one the wallet named', async () => {
    const { client, feed } = fakeTaxi()
    watch(client)
    const elsewhere = { ...satsFareClaim(7n), receiverAddress: 'tark1someoneelse' }
    const otherOperator = satsFareClaim(7n)
    otherOperator.claim!.params.operatorKey = KEYS.other
    feed.args!.onSnapshot({ claims: [elsewhere, otherOperator] })
    await settle()
    expect(client.verifyIncomingClaim).not.toHaveBeenCalled()
  })

  it('withdraws an offer once the Taxi reports the transfer is no longer claimable', async () => {
    const { client, feed } = fakeTaxi()
    const { onGone } = watch(client)
    const recycled = { ...satsFareClaim(7n), state: 'recycled' as const, claimable: false, claim: undefined }
    feed.args!.onChanged({ claims: [recycled] })
    await settle()
    expect(onGone).toHaveBeenCalledWith('tr-sats-7')
  })

  it('unsubscribes from every Taxi when stopped', () => {
    const { client, unsubscribe } = fakeTaxi()
    const { stop } = watch(client, { taxis: [TAXI, { ...TAXI, url: 'https://second.example' }] })
    stop()
    expect(unsubscribe).toHaveBeenCalledTimes(2)
  })
})

describe('claimVerified', () => {
  it("recycles the verified transfer with the planned coin, paying the receiver's own script", async () => {
    const { client, recycle } = fakeTaxi()
    const plan = planReceiverClaim(satsFareClaim(7n), coins([2000n, 500n])) as RecyclePlan
    await claimVerified({ taxi: TAXI, claim: satsFareClaim(7n), transfer: TRANSFER, client }, plan, BOB)
    const [transfer, input, destination] = recycle.mock.calls[0]
    expect(transfer).toBe(TRANSFER)
    expect(input.input).toMatchObject({ txid: plan.coin.txid, vout: 1, value: 500n })
    expect(input.expiry).toEqual({ kind: 'time', value: 4_000_000_000n })
    expect(input.identity).toBe(BOB)
    expect(hex.encode(destination)).toBe(BOB_PK_SCRIPT)
  })
})
