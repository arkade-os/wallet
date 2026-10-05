import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Identity } from '@arkade-os/sdk'
import { hex } from '@scure/base'
import { TaxiClient, type CovenantTransfer, type EventSourceLike, type SubscribeClaimsArgs } from '@arkade-taxi/client'
import {
  ClaimSpent,
  claimVerified,
  guardedClaimIdentity,
  offerKey,
  isFreeReceiverClaim,
  planReceiverClaim,
  taxiActivityFromOffer,
  walletClaimWatch,
  watchReceiverClaims,
  type ClaimClient,
  type ClaimWatch,
  type RecyclePlan,
} from '../../lib/receiverClaims'
import {
  BOB,
  BOB_ADDRESS,
  BOB_PK_SCRIPT,
  assetFareClaim,
  bitcoinClaim,
  coins,
  satsFareClaim,
} from './receiverClaimsFixtures'
import { ASSET_ID, INFO, KEYS, TAXI_URL } from './receiverTaxiFixtures'

const consoleError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/logs')>()),
  consoleError,
}))

describe('claim signing authorization', () => {
  it('preserves identity binding and revokes a retained signer session before it can sign', async () => {
    let allowed = true
    const session = {
      getPublicKey: vi.fn(async () => new Uint8Array()),
      init: vi.fn(async () => {}),
      getNonces: vi.fn(async () => new Map()),
      aggregatedNonces: vi.fn(async () => ({ hasAllNonces: true })),
      sign: vi.fn(async () => new Map()),
    }
    const identity: Identity = {
      xOnlyPublicKey: vi.fn(async () => new Uint8Array()),
      compressedPublicKey: vi.fn(async () => new Uint8Array()),
      sign: vi.fn(async function (this: Identity, tx) {
        expect(this).toBe(identity)
        return tx
      }),
      signMessage: vi.fn(async function (this: Identity) {
        expect(this).toBe(identity)
        return new Uint8Array()
      }),
      signerSession: vi.fn(function (this: Identity) {
        expect(this).toBe(identity)
        return session
      }),
    }
    const guarded = guardedClaimIdentity(identity, () => allowed)
    await guarded.sign({} as never)
    await guarded.signMessage(new Uint8Array(), 'schnorr')
    const retained = guarded.signerSession()
    allowed = false
    expect(() => guarded.sign({} as never)).toThrow(/no longer authorized/)
    expect(() => guarded.signMessage(new Uint8Array(), 'schnorr')).toThrow(/no longer authorized/)
    expect(() => retained.init({} as never, new Uint8Array(), 0n)).toThrow(/no longer authorized/)
    expect(() => retained.sign()).toThrow(/no longer authorized/)
    expect(identity.sign).toHaveBeenCalledTimes(1)
    expect(identity.signMessage).toHaveBeenCalledTimes(1)
    expect(session.init).not.toHaveBeenCalled()
    expect(session.sign).not.toHaveBeenCalled()
  })
})

describe('free receiver claim policy', () => {
  it.each([bitcoinClaim(280n), satsFareClaim(0n), assetFareClaim(0n)])(
    'accepts only lossless free recycling',
    (claim) => {
      expect(isFreeReceiverClaim(claim, planReceiverClaim(claim, coins([1000n])))).toBe(true)
    },
  )

  it.each([satsFareClaim(7n), assetFareClaim(9n)])('requires confirmation for a positive receiver fare', (claim) => {
    expect(isFreeReceiverClaim(claim, planReceiverClaim(claim, coins([1000n])))).toBe(false)
  })

  it('refuses a net reduction of receiver sats or delivered assets even when the fare is zero', () => {
    const claim = assetFareClaim(0n)
    const plan = planReceiverClaim(claim, coins([1000n])) as RecyclePlan
    expect(isFreeReceiverClaim(claim, { ...plan, mergedSats: 999n })).toBe(false)
    expect(
      isFreeReceiverClaim(claim, {
        kind: 'recycle',
        coin: coins([1000n])[0],
        mergedSats: 1000n,
        feeUnits: 0n,
        deliveredUnits: 499n,
      }),
    ).toBe(false)
    expect(isFreeReceiverClaim(claim, { kind: 'wait-for-reclaim', reason: 'fare-exceeds-delivery' })).toBe(false)
  })

  it('allows a free purchase with no wallet contribution', () => {
    const claim = bitcoinClaim(280n, 'purchase')
    expect(isFreeReceiverClaim(claim, planReceiverClaim(claim, []))).toBe(true)
    expect(isFreeReceiverClaim(satsFareClaim(1n), { kind: 'purchase', receivedSats: 330n })).toBe(false)
  })
})

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

  it('floors the coin for an asset fare at dust alone: 329 waits, 330 claims', () => {
    expect(planReceiverClaim(assetFareClaim(9n), coins([329n]))).toMatchObject({
      kind: 'wait-for-reclaim',
      reason: 'no-coin-covers-the-fare',
      neededSats: 330n,
    })
    expect(planReceiverClaim(assetFareClaim(9n), coins([330n]))).toMatchObject({ kind: 'recycle', mergedSats: 330n })
  })

  it('leaves a delivery to return on its own when the asset fare would take all of it', () => {
    expect(planReceiverClaim(assetFareClaim(500n), coins([1000n]))).toMatchObject({
      kind: 'wait-for-reclaim',
      reason: 'fare-exceeds-delivery',
    })
  })

  it('nets the receiver of sub-dust bitcoin what was sent: his coin repays the top-up', () => {
    expect(planReceiverClaim(bitcoinClaim(230n), coins([1000n]))).toMatchObject({
      kind: 'recycle',
      mergedSats: 1100n,
      feeSats: 0n,
    })
    expect(planReceiverClaim(bitcoinClaim(230n), coins([229n]))).toEqual({
      kind: 'wait-for-reclaim',
      reason: 'no-coin-covers-the-fare',
      neededSats: 230n,
    })
    expect(planReceiverClaim(bitcoinClaim(230n, 'purchase'), [])).toEqual({ kind: 'purchase', receivedSats: 330n })
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
const RECYCLED = { ...satsFareClaim(7n), state: 'recycled' as const, claimable: false, claim: undefined }

describe('watchReceiverClaims', () => {
  beforeEach(() => consoleError.mockClear())

  it('preserves verified capability references across expansion and withdraws them from an empty snapshot', async () => {
    const first = fakeTaxi()
    const previous = watch(first.client)
    first.feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    const [verified] = previous.offers
    previous.stop()
    const second = fakeTaxi()
    const additional = fakeTaxi()
    const expanded = watch(second.client, {
      initialOffers: previous.offers,
      clientFor: (url) => (url === TAXI_URL ? second.client : additional.client),
      taxis: [TAXI, { ...TAXI, url: 'https://taxi.additional.example' }],
    })
    second.feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(expanded.offers[0]).toBe(verified)
    expect(second.client.verifyIncomingClaim).not.toHaveBeenCalled()
    second.feed.args!.onSnapshot({ claims: [] })
    expect(expanded.onGone).toHaveBeenCalledWith(offerKey(verified))
    expanded.stop()
  })

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
    const { offers, onGone } = watch(client)
    feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    feed.args!.onChanged({ claims: [RECYCLED] })
    await settle()
    expect(onGone).toHaveBeenCalledWith(offerKey(offers[0]))
  })

  it('does not offer a claim withdrawn while verification is in flight', async () => {
    let finishVerification!: (transfer: CovenantTransfer) => void
    const { client, feed } = fakeTaxi({
      verifyIncomingClaim: vi.fn(() => new Promise<CovenantTransfer>((resolve) => (finishVerification = resolve))),
    })
    const { offers, onGone } = watch(client)
    feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(client.verifyIncomingClaim).toHaveBeenCalledOnce()
    feed.args!.onChanged({ claims: [RECYCLED] })
    finishVerification(TRANSFER)
    await settle()
    expect(offers).toEqual([])
    expect(onGone).not.toHaveBeenCalled()

    feed.args!.onChanged({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(client.verifyIncomingClaim).toHaveBeenCalledTimes(2)
    finishVerification(TRANSFER)
    await settle()
    expect(offers).toHaveLength(1)
  })

  it('withdraws an offer a fresh snapshot from its own Taxi no longer lists, and nothing of another Taxi', async () => {
    const taxis = new Map([TAXI_URL, 'https://taxi.second.example'].map((url) => [url, fakeTaxi()]))
    const { offers, onGone } = watch(fakeTaxi().client, {
      taxis: [...taxis.keys()].map((url) => ({ ...TAXI, url })),
      clientFor: (url) => taxis.get(url)!.client,
    })
    const [first, second] = [...taxis.values()]
    first.feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    second.feed.args!.onSnapshot({ claims: [] })
    await settle()
    expect(onGone).not.toHaveBeenCalled()
    first.feed.args!.onSnapshot({ claims: [] })
    await settle()
    expect(onGone.mock.calls).toEqual([[offerKey(offers[0])]])
  })

  it('withdraws nothing for a transfer this Taxi never offered', async () => {
    const { client, feed } = fakeTaxi()
    const { onGone } = watch(client)
    feed.args!.onChanged({ claims: [RECYCLED] })
    await settle()
    expect(onGone).not.toHaveBeenCalled()
  })

  it('keeps the offers of two Taxis apart when they reuse one transfer id', async () => {
    const taxis = new Map([TAXI_URL, 'https://taxi.second.example'].map((url) => [url, fakeTaxi()]))
    const { offers, onGone } = watch(fakeTaxi().client, {
      taxis: [...taxis.keys()].map((url) => ({ ...TAXI, url })),
      clientFor: (url) => taxis.get(url)!.client,
    })
    const [first, second] = [...taxis.values()]
    first.feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    second.feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(offers.map(offerKey)).toEqual([`${TAXI_URL} tr-sats-7`, 'https://taxi.second.example tr-sats-7'])
    second.feed.args!.onChanged({ claims: [RECYCLED] })
    await settle()
    expect(onGone.mock.calls).toEqual([['https://taxi.second.example tr-sats-7']])
    first.feed.args!.onChanged({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(offers.at(-1)).toBe(offers[0])
  })

  it('unsubscribes from every Taxi when stopped', () => {
    const { client, unsubscribe } = fakeTaxi()
    const { stop } = watch(client, { taxis: [TAXI, { ...TAXI, url: 'https://second.example' }] })
    stop()
    expect(unsubscribe).toHaveBeenCalledTimes(2)
  })

  it('opens one stream per Taxi URL, and verifies each claim under the key it was remembered with', async () => {
    const { client, feed } = fakeTaxi()
    const clientFor = vi.fn(() => client)
    watch(client, { clientFor, taxis: [TAXI, { ...TAXI, operatorKey: KEYS.other }] })
    expect(clientFor).toHaveBeenCalledTimes(1)
    expect(client.subscribeClaims).toHaveBeenCalledTimes(1)
    const rotated = satsFareClaim(7n)
    rotated.claim!.params.operatorKey = KEYS.other
    feed.args!.onSnapshot({ claims: [rotated] })
    await settle()
    expect(client.verifyIncomingClaim).toHaveBeenCalledWith(
      rotated,
      expect.anything(),
      expect.objectContaining({ operatorKey: hex.decode(KEYS.other) }),
      CONFIG,
    )
  })

  it('offers a verified claim again on the next feed event, without verifying it again', async () => {
    const { client, feed } = fakeTaxi()
    const { offers } = watch(client)
    feed.args!.onSnapshot({ claims: [satsFareClaim(7n)] })
    await settle()
    feed.args!.onChanged({ claims: [satsFareClaim(7n)] })
    await settle()
    expect(offers).toHaveLength(2)
    expect(offers[1]).toBe(offers[0])
    expect(client.verifyIncomingClaim).toHaveBeenCalledTimes(1)
  })
})

/** Enough of an EventSource for the real TaxiClient: `fail` fires the error event in a given readyState. */
class FakeSource {
  readyState = 0
  closed = false
  private listeners = new Map<string, Set<(event: unknown) => void>>()
  addEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners.set(type, (this.listeners.get(type) ?? new Set()).add(listener))
  }
  removeEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners.get(type)?.delete(listener)
  }
  close() {
    this.closed = true
    this.readyState = 2
  }
  emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
  fail(readyState: number) {
    this.readyState = readyState
    this.emit('error', { target: this })
  }
}

describe('the claim feed once EventSource gives up', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const followTaxi = () => {
    const sources: FakeSource[] = []
    const eventSourceFactory = (): EventSourceLike => {
      const source = new FakeSource()
      sources.push(source)
      return source as unknown as EventSourceLike
    }
    const { stop } = watch(fakeTaxi().client, {
      clientFor: (url) => new TaxiClient({ baseUrl: url, eventSourceFactory }),
    })
    return { sources, stop }
  }

  it('leaves a reconnecting feed to EventSource, but resubscribes a closed one with a doubling backoff', () => {
    const { sources } = followTaxi()
    sources[0].fail(0)
    vi.advanceTimersByTime(120_000)
    expect(sources).toHaveLength(1)

    sources[0].fail(2)
    expect(sources[0].closed).toBe(true)
    vi.advanceTimersByTime(4_999)
    expect(sources).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sources).toHaveLength(2)

    sources[1].fail(2)
    vi.advanceTimersByTime(9_999)
    expect(sources).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(sources).toHaveLength(3)
  })

  it('caps the backoff at a minute, and starts it over once a snapshot arrives', () => {
    const { sources } = followTaxi()
    for (let round = 0; round < 6; round++) {
      sources.at(-1)!.fail(2)
      vi.advanceTimersByTime(60_000)
    }
    expect(sources).toHaveLength(7)
    sources.at(-1)!.emit('claims-snapshot', { data: '{"claims":[]}' })
    sources.at(-1)!.fail(2)
    vi.advanceTimersByTime(5_000)
    expect(sources).toHaveLength(8)
  })

  it('stops retrying once the watch is stopped', () => {
    const { sources, stop } = followTaxi()
    sources[0].fail(2)
    stop()
    vi.advanceTimersByTime(600_000)
    expect(sources).toHaveLength(1)
  })
})

describe('walletClaimWatch', () => {
  afterEach(() => vi.unstubAllEnvs())

  const aspInfo = {
    url: 'https://arkd.wallet.example',
    network: 'regtest',
    signerPubkey: KEYS.server,
    dust: 330n,
    vtxoMinAmount: 1n,
    vtxoTreeExpiry: 604_800n,
    checkpointTapscript: 'cafe',
  }
  const production = () =>
    walletClaimWatch({ aspInfo, taxis: [TAXI], receiverAddress: BOB_ADDRESS, onOffer: vi.fn(), onGone: vi.fn() })

  it("trusts the server key this wallet runs against and its own pinned co-signer key, never the Taxi's", () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
    expect(production().trust).toEqual({
      serverKey: hex.decode(KEYS.server),
      emulatorKey: hex.decode(KEYS.emulator),
      vtxoMinAmount: 1n,
      hrp: 'tark',
    })
  })

  it("spends through this wallet's own arkd, taking only the emulator URL from the Taxi", async () => {
    vi.stubEnv('VITE_EMULATOR_PUBKEY', KEYS.emulator)
    const { client } = fakeTaxi()
    expect(await production().spendConfig(client)).toEqual({
      arkdUrl: 'https://arkd.wallet.example',
      emulatorUrl: INFO.emulatorUrl,
      network: 'regtest',
      serverUnrollScript: 'cafe',
    })
  })
})

describe('claimVerified', () => {
  it('reports a failed recycle as spent: the one-shot capability is gone, so only a reload retries', async () => {
    const { client } = fakeTaxi({
      recycle: vi.fn(async () => {
        throw new Error('receiver funding input is not independently spendable')
      }),
    })
    const plan = planReceiverClaim(satsFareClaim(7n), coins([1000n])) as RecyclePlan
    const offer = { taxi: TAXI, claim: satsFareClaim(7n), transfer: TRANSFER, client }
    await expect(claimVerified(offer, plan, BOB)).rejects.toBeInstanceOf(ClaimSpent)
  })

  it('does not report a coin refused before recycle as spent, and never calls recycle with it', async () => {
    const { client, recycle } = fakeTaxi()
    const [coin] = coins([1000n])
    const plan = { ...(planReceiverClaim(satsFareClaim(7n), [coin]) as RecyclePlan) }
    plan.coin = { ...coin, virtualStatus: { state: 'spent' } } as typeof coin
    const offer = { taxi: TAXI, claim: satsFareClaim(7n), transfer: TRANSFER, client }
    const failure = await claimVerified(offer, plan, BOB).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(Error)
    expect(failure).not.toBeInstanceOf(ClaimSpent)
    expect(recycle).not.toHaveBeenCalled()
  })

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

describe('taxiActivityFromOffer', () => {
  it('records a delivery with its loan, the fare its receiver pays, and who an unclaimed one returns to', () => {
    expect(taxiActivityFromOffer({ taxi: TAXI, claim: satsFareClaim(7n) })).toEqual({
      role: 'receiver',
      network: 'regtest',
      taxiUrl: TAXI_URL,
      transferId: 'tr-sats-7',
      mode: 'recycle',
      assetId: ASSET_ID,
      units: '500',
      carrierSats: '330',
      fare: { currency: 'sats', units: '7' },
      returnsTo: 'receiver',
      lockupTxid: 'd'.repeat(64),
      state: 'locked',
      updatedAt: 1_700_000_000,
      createdAt: 1_700_000_000,
    })
    expect(taxiActivityFromOffer({ taxi: TAXI, claim: assetFareClaim(9n) }).fare).toEqual({
      currency: 'asset',
      units: '9',
    })
  })

  it('records a bitcoin delivery in sats: the dust less what the Taxi lent', () => {
    const bitcoin = satsFareClaim(7n)
    delete bitcoin.claim!.params.assetId
    delete bitcoin.claim!.params.receiverFare
    delete bitcoin.claim!.params.recoveryRecipient
    delete bitcoin.claim!.assetUnits
    bitcoin.claim!.params.topup = '230'
    const activity = taxiActivityFromOffer({ taxi: TAXI, claim: bitcoin })
    expect(activity).toMatchObject({ units: '100', carrierSats: '230', returnsTo: 'sender' })
    expect(activity).not.toHaveProperty('assetId')
    expect(activity).not.toHaveProperty('fare')
  })
})
