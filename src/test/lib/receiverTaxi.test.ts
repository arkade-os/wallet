import { describe, it, expect } from 'vitest'
import { hex } from '@scure/base'
import { arkadeContextOf, probeReceiverTaxi, receiverPaidCarrier } from '../../lib/receiverTaxi'
import {
  ASSET_ID,
  COVENANT_ADDRESS,
  INFO,
  KEYS,
  QUOTE,
  RECEIVER_ADDRESS,
  TAXI,
  TAXI_URL,
  arkadeContext,
  taxiFetch,
  unreachable,
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

  it('refuses an unclaimedMode this build does not implement', async () => {
    expect(await probe({ info: withRule({ unclaimedMode: 'custody' }) })).toMatchObject({
      reason: 'unsupported-unclaimed-mode',
    })
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

describe('receiverPaidCarrier', () => {
  const maker = hex.decode(KEYS.maker)

  it('asks for a receiver-paid quote and maps the verified descriptor', async () => {
    const fetch = taxiFetch()
    const carrier = await receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), maker)

    const [, init] = fetch.mock.calls.find(([url]) => url === `${TAXI_URL}/v1/receive-quotes`)!
    expect(JSON.parse(init.body)).toEqual({
      receiverAddress: RECEIVER_ADDRESS,
      makerPublicKey: KEYS.maker,
      assetId: QUOTE.params.assetId,
      fareId: 'flat',
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
      inputExpiryFloor: { kind: 'time', value: 4_000_000_000n },
    })
  })

  it('sends no fareId when the receiver named none', async () => {
    const fetch = taxiFetch()
    await receiverPaidCarrier({ url: TAXI_URL, operatorKey: KEYS.operator }, INFO, arkadeContext({ fetch }), maker)
    const [, init] = fetch.mock.calls.find(([url]) => url === `${TAXI_URL}/v1/receive-quotes`)!
    expect(JSON.parse(init.body)).not.toHaveProperty('fareId')
  })

  it('refuses a sender-paid answer to a receiver-paid request', async () => {
    const receiverOnly = ['payer', 'receiverFare', 'unclaimedMode']
    const senderPaid = Object.fromEntries(Object.entries(QUOTE).filter(([key]) => !receiverOnly.includes(key)))
    const fetch = taxiFetch({ quote: senderPaid })
    await expect(receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), maker)).rejects.toThrow(/payer/)
  })

  it("verifies against the running context's emulator key, not the Taxi's", async () => {
    const ctx = arkadeContext({ emulatorKey: hex.decode(KEYS.other) })
    await expect(receiverPaidCarrier(TAXI, INFO, ctx, maker)).rejects.toThrow(/untrusted emulator/)
  })

  it('surfaces a Taxi that refuses the request', async () => {
    const fetch = taxiFetch({
      quote: { code: 'BAD_REQUEST', message: 'unexpected request field payer' },
      quoteStatus: 400,
    })
    await expect(receiverPaidCarrier(TAXI, INFO, arkadeContext({ fetch }), maker)).rejects.toThrow()
  })
})

describe('arkadeContextOf', () => {
  it("takes every trusted fact from the wallet's own Arkade server", () => {
    const info = {
      network: 'mutinynet',
      signerPubkey: `02${KEYS.server}`,
      dust: 330n,
      vtxoMinAmount: 1n,
      unilateralExitDelay: 86_400n,
    }
    const ctx = arkadeContextOf(info)
    expect(ctx).toMatchObject({ hrp: 'tark', dust: 330n, vtxoMinAmount: 1n, locktimeDomain: 'time' })
    expect(hex.encode(ctx.serverKey)).toBe(KEYS.server)
    expect(ctx.emulatorKey).toHaveLength(32)
    const mainnet = arkadeContextOf({ ...info, network: 'bitcoin', unilateralExitDelay: 144n })
    expect(mainnet).toMatchObject({ hrp: 'ark', locktimeDomain: 'height' })
  })
})
