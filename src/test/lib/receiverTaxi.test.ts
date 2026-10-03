import { describe, it, expect } from 'vitest'
import { hex } from '@scure/base'
import {
  arkadeContextOf,
  callerMinimum,
  probeBitcoinTaxi,
  probeReceiverTaxi,
  receiverPaidCarrier,
  vetBitcoinTaxi,
  type TaxiInfo,
} from '../../lib/receiverTaxi'
import {
  ASSET_ID,
  BITCOIN_INFO,
  BITCOIN_RULE,
  COVENANT_ADDRESS,
  DEFAULT_FLOOR,
  EARLY_FLOOR,
  EARLY_QUOTE,
  INFO,
  KEYS,
  NOW,
  QUOTE,
  RECEIVER_ADDRESS,
  TAXI,
  TAXI_URL,
  TWO_FARES,
  WIRE_ASSET_ID,
  arkadeContext,
  taxiFetch,
  unreachable,
  withBitcoinRule,
  withRule,
} from './receiverTaxiFixtures'

const probe = (over: { info?: unknown } = {}, ctx = {}) =>
  probeReceiverTaxi(TAXI, arkadeContext({ fetch: taxiFetch(over), ...ctx }))

describe('probeReceiverTaxi', () => {
  it('passes a Taxi that checks out, returning its info', async () => {
    expect(await probe()).toEqual({ ok: true, info: INFO })
  })

  it('refuses a Taxi whose operatorKey differs from taxikey', async () => {
    expect(await probeReceiverTaxi({ url: TAXI_URL, operatorKey: KEYS.other }, arkadeContext())).toMatchObject({
      ok: false,
      reason: 'operator-key-mismatch',
    })
  })

  it('never compares an uppercase /v1/info operator key: the client refuses the info first', async () => {
    expect(await probe({ info: { ...INFO, operatorKey: KEYS.operator.toUpperCase() } })).toMatchObject({
      reason: 'unreachable',
    })
  })

  it('refuses a Taxi on another Arkade server or emulator', async () => {
    expect(await probe({}, { serverKey: hex.decode(KEYS.other) })).toMatchObject({ reason: 'server-key-mismatch' })
    expect(await probe({}, { emulatorKey: hex.decode(KEYS.other) })).toMatchObject({ reason: 'emulator-key-mismatch' })
    expect(await probe({}, { emulatorKey: new Uint8Array() })).toMatchObject({ reason: 'emulator-key-mismatch' })
  })

  it('refuses a receiver on another network', async () => {
    expect(await probe({}, { hrp: 'ark' })).toMatchObject({ reason: 'network-mismatch' })
  })

  it('refuses a paused Taxi and one that does not serve the asset', async () => {
    expect(await probe({ info: { ...INFO, paused: true } })).toMatchObject({ reason: 'paused' })
    expect(await probe({ info: withRule({ enabled: false }) })).toMatchObject({ reason: 'asset-not-served' })
    expect(await probe({ info: { ...INFO, assetRules: [] } })).toMatchObject({ reason: 'asset-not-served' })
  })

  it('uses a Taxi that serves the asset only through its "*" rule, which covers no id that is not an asset', async () => {
    const anyAsset = withRule({ assetId: '*' })
    expect(await probe({ info: anyAsset })).toEqual({ ok: true, info: anyAsset })
    expect(await probe({ info: anyAsset }, { assetId: '' })).toMatchObject({ reason: 'asset-not-served' })
  })

  it('holds an asset to its own rule over "*", wherever each sits', async () => {
    const own = INFO.assetRules[0]
    for (const assetRules of [
      [
        { ...own, assetId: '*' },
        { ...own, enabled: false },
      ],
      [
        { ...own, enabled: false },
        { ...own, assetId: '*' },
      ],
    ])
      expect(await probe({ info: { ...INFO, assetRules } })).toMatchObject({ reason: 'asset-not-served' })
  })

  it('refuses an unclaimedMode this build does not implement', async () => {
    expect(await probe({ info: withRule({ unclaimedMode: 'custody' }) })).toMatchObject({
      reason: 'unsupported-unclaimed-mode',
    })
  })

  it('refuses a Taxi whose asset rule does not allow the recycle claim a receiver-paid quote needs', async () => {
    expect(await probe({ info: withRule({ claim: 'purchase' }) })).toMatchObject({ reason: 'recycle-not-allowed' })
    expect(await probe({ info: withRule({ claim: 'recycle' }) })).toMatchObject({ ok: true })
  })

  it('refuses a Taxi that would not lend the whole dust, reading the asset cap before the global one', async () => {
    expect(await probe({ info: { ...INFO, maxPerPaymentTopupSats: '329' } })).toMatchObject({
      reason: 'loan-cap-below-dust',
    })
    expect(await probe({ info: withRule({ maxTopupSats: '329' }) })).toMatchObject({ reason: 'loan-cap-below-dust' })
    const assetCapOnly = { ...withRule({ maxTopupSats: '330' }), maxPerPaymentTopupSats: '0' }
    expect(await probe({ info: assetCapOnly })).toMatchObject({ ok: true })
  })

  it('refuses the fare the receiver named when the Taxi cannot price it for him', async () => {
    const fares = [
      { id: 'flat', currency: 'sats', pricing: { kind: 'flat', units: '7' } },
      {
        id: 'share',
        currency: 'sameAsset',
        pricing: { kind: 'proportional', bps: 100, minUnits: '1', maxUnits: null },
      },
      { id: 'token', currency: 'token', assetId: WIRE_ASSET_ID, pricing: { kind: 'flat', units: '1' } },
    ]
    const info = withRule({ fares })
    const named = (fareId?: string) =>
      probeReceiverTaxi({ ...TAXI, fareId }, arkadeContext({ fetch: taxiFetch({ info }) }))
    expect(await named('share')).toMatchObject({ reason: 'fare-unavailable' })
    expect(await named('token')).toMatchObject({ reason: 'fare-unavailable' })
    expect(await named('gone')).toMatchObject({ reason: 'fare-unavailable' })
    expect(await named('flat')).toMatchObject({ ok: true })
    expect(await named(undefined)).toMatchObject({ ok: true })
    const tokenFirst = withRule({ fares: [fares[2], fares[0]] })
    expect(
      await probeReceiverTaxi(
        { ...TAXI, fareId: undefined },
        arkadeContext({ fetch: taxiFetch({ info: tokenFirst }) }),
      ),
    ).toMatchObject({ reason: 'fare-unavailable' })
  })

  it('checks in the order Ruling 7 lists', async () => {
    const everythingWrong = { ...withRule({ enabled: false }), paused: true, serverKey: KEYS.other }
    expect(await probe({ info: everythingWrong })).toMatchObject({ reason: 'server-key-mismatch' })
    expect(await probe({ info: { ...INFO, paused: true } }, { hrp: 'ark' })).toMatchObject({
      reason: 'network-mismatch',
    })
    expect(await probe({ info: { ...withRule({ enabled: false }), paused: true } })).toMatchObject({ reason: 'paused' })
  })

  it('reports an unreachable Taxi rather than throwing', async () => {
    expect(await probeReceiverTaxi(TAXI, arkadeContext({ fetch: unreachable() }))).toMatchObject({
      reason: 'unreachable',
    })
    expect(await probe({ info: { not: 'info' } })).toMatchObject({ reason: 'unreachable' })
  })

  it('treats an http Taxi from an https page as unreachable without fetching', async () => {
    const fetch = taxiFetch()
    const plain = { ...TAXI, url: 'http://taxi.example' }
    expect(await probeReceiverTaxi(plain, arkadeContext({ fetch }))).toMatchObject({ reason: 'unreachable' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('vetBitcoinTaxi', () => {
  const vet = (info: TaxiInfo, amount: bigint, ask = {}, ctx = {}) =>
    vetBitcoinTaxi(info, arkadeContext(ctx), { receiverAddress: RECEIVER_ADDRESS, amount, ...ask })

  it('carries a sub-dust amount with the top-up that makes it dust, and its free sats fare', () => {
    expect(vet(BITCOIN_INFO, 100n)).toMatchObject({
      ok: true,
      topup: 230n,
      fareUnits: 0n,
      fares: [{ fare: BITCOIN_RULE.fares[0], units: 0n }],
      modes: ['recycle', 'sponsored'],
    })
    expect(vet(BITCOIN_INFO, 329n)).toMatchObject({ ok: true, topup: 1n })
  })

  it('offers the claims its rule allows, and direct delivery always', () => {
    expect(vet(withBitcoinRule({ claim: 'either' }), 100n)).toMatchObject({
      modes: ['recycle', 'purchase', 'sponsored'],
    })
    expect(vet(withBitcoinRule({ claim: 'purchase' }), 100n)).toMatchObject({ modes: ['purchase', 'sponsored'] })
  })

  it('offers only direct delivery at a priced fare, which the Taxi refuses on a covenant bitcoin transfer', () => {
    const priced = { id: 'one', currency: 'sats', pricing: { kind: 'flat', units: '1' } }
    expect(vet(withBitcoinRule({ claim: 'either', fares: [priced] }), 100n)).toMatchObject({
      ok: true,
      fareUnits: 1n,
      modes: ['sponsored'],
    })
  })

  it('refuses an amount the covenant cannot hold: either side of it must be at least vtxoMinAmount', () => {
    for (const amount of [0n, 330n, 1_000n])
      expect(vet(BITCOIN_INFO, amount)).toMatchObject({ reason: 'amount-outside-carrier' })
    const minimum31 = { ...BITCOIN_INFO, vtxoMinAmount: '31' }
    expect(vet(minimum31, 300n, {}, { vtxoMinAmount: 31n })).toMatchObject({ reason: 'amount-outside-carrier' })
    expect(vet(minimum31, 299n, {}, { vtxoMinAmount: 31n })).toMatchObject({ ok: true, topup: 31n })
    expect(vet(minimum31, 30n, {}, { vtxoMinAmount: 31n })).toMatchObject({ reason: 'amount-outside-carrier' })
  })

  it('refuses a top-up above the rule cap, or above the per-payment cap when the rule has none', () => {
    expect(vet(withBitcoinRule({ maxTopupSats: '100' }), 200n)).toMatchObject({ reason: 'loan-cap-below-shortfall' })
    expect(vet(withBitcoinRule({ maxTopupSats: '100' }), 230n)).toMatchObject({ ok: true, topup: 100n })
    const perPayment = { ...BITCOIN_INFO, maxPerPaymentTopupSats: '200' }
    expect(vet(perPayment, 100n)).toMatchObject({ reason: 'loan-cap-below-shortfall' })
    expect(vet(perPayment, 130n)).toMatchObject({ ok: true, topup: 200n })
  })

  it('refuses a paused Taxi, and one without an enabled bitcoin rule', () => {
    expect(vet({ ...BITCOIN_INFO, paused: true }, 100n)).toMatchObject({ reason: 'paused' })
    expect(vet(withBitcoinRule({ enabled: false }), 100n)).toMatchObject({ reason: 'bitcoin-not-served' })
    const anyAssetOnly = { ...BITCOIN_INFO, assetRules: [{ ...INFO.assetRules[0], assetId: '*' as const }] }
    expect(vet(anyAssetOnly, 100n)).toMatchObject({ reason: 'bitcoin-not-served' })
  })

  it('prices only sats fares, a proportion of them on the top-up', () => {
    const token = { id: 'token', currency: 'token', assetId: WIRE_ASSET_ID, pricing: { kind: 'flat', units: '1' } }
    expect(vet(withBitcoinRule({ fares: [token] }), 100n)).toMatchObject({ reason: 'no-sats-fare' })
    expect(vet(BITCOIN_INFO, 100n, { fareId: 'gone' })).toMatchObject({ reason: 'no-sats-fare' })
    const tenth = {
      id: 'tenth',
      currency: 'sats',
      pricing: { kind: 'proportional', bps: 1000, minUnits: '0', maxUnits: null },
    }
    expect(vet(withBitcoinRule({ fares: [token, tenth] }), 100n)).toMatchObject({ ok: true, fareUnits: 23n })
  })

  it('holds the Taxi to the operator key named, this wallet’s keys and network, and its dust limits', () => {
    expect(vet(BITCOIN_INFO, 100n, { operatorKey: KEYS.other })).toMatchObject({ reason: 'operator-key-mismatch' })
    expect(vet(BITCOIN_INFO, 100n, { operatorKey: KEYS.operator })).toMatchObject({ ok: true })
    expect(vet(BITCOIN_INFO, 100n, {}, { serverKey: hex.decode(KEYS.other) })).toMatchObject({
      reason: 'server-key-mismatch',
    })
    expect(vet(BITCOIN_INFO, 100n, {}, { emulatorKey: hex.decode(KEYS.other) })).toMatchObject({
      reason: 'emulator-key-mismatch',
    })
    expect(vet(BITCOIN_INFO, 100n, {}, { hrp: 'ark' })).toMatchObject({ reason: 'network-mismatch' })
    expect(vet({ ...BITCOIN_INFO, dust: '333' }, 100n)).toMatchObject({ reason: 'carrier-limits-mismatch' })
  })
})

describe('probeBitcoinTaxi', () => {
  const probeAt = (url: string, fetch: typeof globalThis.fetch) =>
    probeBitcoinTaxi({ url }, arkadeContext({ fetch }), RECEIVER_ADDRESS, 100n)

  it('vets the info the Taxi serves', async () => {
    expect(await probeAt(TAXI_URL, taxiFetch({ info: BITCOIN_INFO }))).toMatchObject({ ok: true, topup: 230n })
    expect(await probeAt(TAXI_URL, taxiFetch())).toMatchObject({ reason: 'bitcoin-not-served' })
  })

  it('calls a Taxi it cannot reach, or may not from this page, unreachable', async () => {
    expect(await probeAt(TAXI_URL, unreachable())).toMatchObject({ reason: 'unreachable' })
    const fetch = taxiFetch({ info: BITCOIN_INFO })
    expect(await probeAt('http://taxi.example', fetch)).toMatchObject({ reason: 'unreachable' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('receiverPaidCarrier', () => {
  // The minimum the rail derives from the fixture clock: NOW + 900s funding + 3600s claim.
  const MINIMUM = NOW + 4_500n
  const payer = { makerPublicKey: hex.decode(KEYS.maker), fundingExpiry: 4_500_000_000n, minimum: MINIMUM }
  const quoteBody = (fetch: ReturnType<typeof taxiFetch>) =>
    JSON.parse(fetch.mock.calls.find(([url]) => url === `${TAXI_URL}/v1/receive-quotes`)![1].body)

  it('asks for a receiver-paid quote and maps the verified descriptor', async () => {
    const fetch = taxiFetch()
    const carrier = await receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), payer)

    expect(quoteBody(fetch)).toEqual({
      receiverAddress: RECEIVER_ADDRESS,
      makerPublicKey: KEYS.maker,
      assetId: QUOTE.params.assetId,
      fareId: 'flat',
      fundingExpiry: { kind: 'time', value: '4500000000' },
      payer: 'receiver',
    })
    expect(carrier).toEqual({
      choice: {
        mode: 'recycleReceiver',
        quote: {
          quoteId: 'rq-1',
          receiveAddress: COVENANT_ADDRESS,
          makerPublicKey: KEYS.maker,
          assetId: ASSET_ID,
          physicalSats: 330n,
          loanSats: 330n,
          expiresAt: 4_100_000_000,
        },
        taxi: { url: TAXI_URL, operatorKey: KEYS.operator },
      },
      inputExpiryFloor: { kind: 'time', value: DEFAULT_FLOOR },
    })
  })

  it("binds the payer's funding expiry, so the Taxi's floor admits her older coins", async () => {
    const fetch = taxiFetch()
    const carrier = await receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), {
      ...payer,
      fundingExpiry: EARLY_FLOOR,
    })
    expect(quoteBody(fetch).fundingExpiry).toEqual({ kind: 'time', value: EARLY_FLOOR.toString() })
    expect(carrier.inputExpiryFloor).toEqual({ kind: 'time', value: EARLY_FLOOR })
    expect(carrier.choice.quote.receiveAddress).toBe(EARLY_QUOTE.covenantAddress)
  })

  it('refuses a Taxi that ignores the funding expiry it was sent', async () => {
    const fetch = taxiFetch({ quote: QUOTE })
    const ctx = arkadeContext({ fetch })
    await expect(receiverPaidCarrier(TAXI, INFO, ctx, { ...payer, fundingExpiry: EARLY_FLOOR })).rejects.toThrow(
      /input expiry floor/,
    )
  })

  it('refuses a floor in the past, or too near to fund and claim before', async () => {
    const past = { ...payer, minimum: DEFAULT_FLOOR + 1_000n }
    await expect(receiverPaidCarrier(TAXI, INFO, arkadeContext(), past)).rejects.toThrow(/below the caller minimum/)
    const tooNear = { ...payer, minimum: DEFAULT_FLOOR + 1n }
    await expect(receiverPaidCarrier(TAXI, INFO, arkadeContext(), tooNear)).rejects.toThrow(/below the caller minimum/)
  })

  it('sends no fareId when the receiver named none', async () => {
    const fetch = taxiFetch()
    await receiverPaidCarrier({ url: TAXI_URL, operatorKey: KEYS.operator }, INFO, arkadeContext({ fetch }), payer)
    expect(quoteBody(fetch)).not.toHaveProperty('fareId')
  })

  it('refuses a quote priced at another fare than the one the receiver named', async () => {
    const cheap = { ...TAXI, fareId: 'cheap' }
    const ctx = arkadeContext({ fetch: taxiFetch({ info: TWO_FARES }) })
    await expect(receiverPaidCarrier(cheap, TWO_FARES, ctx, payer)).rejects.toThrow(/fare differs/)
  })

  it('refuses a sender-paid answer to a receiver-paid request', async () => {
    const receiverOnly = ['payer', 'receiverFare', 'unclaimedMode']
    const senderPaid = Object.fromEntries(Object.entries(QUOTE).filter(([key]) => !receiverOnly.includes(key)))
    const fetch = taxiFetch({ quote: senderPaid })
    await expect(receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), payer)).rejects.toThrow(/payer/)
  })

  it("verifies against the running context's emulator key, not the Taxi's", async () => {
    const ctx = arkadeContext({ emulatorKey: hex.decode(KEYS.other) })
    await expect(receiverPaidCarrier(TAXI, INFO, ctx, payer)).rejects.toThrow(/untrusted emulator/)
  })

  it('surfaces a Taxi that refuses the request', async () => {
    const fetch = taxiFetch({
      quote: { code: 'BAD_REQUEST', message: 'unexpected request field payer' },
      quoteStatus: 400,
    })
    await expect(receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), payer)).rejects.toThrow()
  })
})

describe('callerMinimum', () => {
  it('adds the funding and claim windows to the clock, in the context domain', async () => {
    expect(await callerMinimum(arkadeContext())).toBe(NOW + 900n + 3_600n)
    expect(await callerMinimum(arkadeContext({ locktimeDomain: 'height', clock: async () => 100n }))).toBe(136n)
  })
})

describe('arkadeContextOf', () => {
  const info = {
    network: 'mutinynet',
    signerPubkey: `02${KEYS.server}`,
    dust: 330n,
    vtxoMinAmount: 1n,
    vtxoTreeExpiry: 604_672n,
  }
  const tip = async () => 812

  it("takes every trusted fact from the wallet's own Arkade server", async () => {
    const ctx = arkadeContextOf(info, tip)
    expect(ctx).toMatchObject({ hrp: 'tark', dust: 330n, vtxoMinAmount: 1n, locktimeDomain: 'time' })
    expect(hex.encode(ctx.serverKey)).toBe(KEYS.server)
    expect(ctx.emulatorKey).toHaveLength(32)
    expect(Number(await ctx.clock())).toBeCloseTo(Date.now() / 1000, -1)
    expect(arkadeContextOf({ ...info, network: 'bitcoin' }, tip)).toMatchObject({ hrp: 'ark', locktimeDomain: 'time' })
  })

  it('counts in blocks, from the chain tip, only when the batch expiry does', async () => {
    const regtest = arkadeContextOf({ ...info, network: 'regtest', vtxoTreeExpiry: 20n }, tip)
    expect(regtest.locktimeDomain).toBe('height')
    expect(await regtest.clock()).toBe(812n)
    expect(arkadeContextOf({ ...info, vtxoTreeExpiry: undefined }, tip).locktimeDomain).toBe('time')
  })
})
