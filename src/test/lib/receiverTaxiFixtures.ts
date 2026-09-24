import { vi } from 'vitest'
import { hex } from '@scure/base'
import type { Bip21Taxi } from '../../lib/bip21'
import type { TaxiInfo, TaxiProbeContext } from '../../lib/receiverTaxi'

// Built by the vendored @arkade-taxi packages (dd8b03a1) and accepted by their verifyReceiveQuote.
export const KEYS = {
  receiver: '1b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
  maker: '4d4b6cd1361032ca9bd2aeb9d900aa4d45d9ead80ac9423374c451a7254d0766',
  operator: '531fe6068134503d2723133227c867ac8fa6c83c537e9a44c3c5bdbdcb1fe337',
  server: '462779ad4aad39514614751a71085f2f10e1c7a593e4e030efb5b8721ce55b0b',
  emulator: '62c0a046dacce86ddd0343c6d3c7c79c2208ba0d9c9cf24a6d046d21d21f90f7',
  other: 'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
}
export const ASSET_ID = '201f1e1d1c1b1a191817161514131211100f0e0d0c0b0a0908070605040302010700'
const WIRE_ASSET_ID = { txid: '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20', groupIndex: 7 }
export const RECEIVER_ADDRESS =
  'tark1qprzw7ddf2knj52xz3635uggtuh3pcw85kf7fcpsa76msusuu4dskxuyc4t8kynygzv460k442aq2ewhrcvrgczgr8lec9l4a82a6pu0lsh6sq'
export const COVENANT_ADDRESS =
  'tark1qprzw7ddf2knj52xz3635uggtuh3pcw85kf7fcpsa76msusuu4dshzqfugytgezaur0ssjltfhglgjwnaxq5tvxcxyxvpcz490qemfss7z4y5h'
export const TAXI_URL = 'https://taxi.example'
export const TAXI: Bip21Taxi = { url: TAXI_URL, operatorKey: KEYS.operator, fareId: 'flat' }

export const INFO: TaxiInfo = {
  protocolVersion: 1,
  operatorKey: KEYS.operator,
  serverKey: KEYS.server,
  emulatorKey: KEYS.emulator,
  arkdUrl: 'https://arkd.example',
  emulatorUrl: 'https://emulator.example',
  dust: '330',
  vtxoMinAmount: '1',
  assetRules: [
    {
      assetId: WIRE_ASSET_ID,
      enabled: true,
      claim: 'either',
      maxTopupSats: null,
      unclaimedMode: 'reclaim',
      fares: [{ id: 'flat', currency: 'sats', pricing: { kind: 'flat', units: '7' } }],
    },
  ],
  maxPerPaymentTopupSats: '330',
  paused: false,
}

export const QUOTE = {
  quoteId: 'rq-1',
  state: 'quoted',
  receiverAddress: RECEIVER_ADDRESS,
  makerPublicKey: KEYS.maker,
  params: {
    receiverKey: KEYS.receiver,
    senderKey: KEYS.maker,
    operatorKey: KEYS.operator,
    dust: '330',
    topup: '330',
    locktime: '3800000000',
    assetId: WIRE_ASSET_ID,
    recoveryRecipient: 'receiver',
    claimMode: 'recycle',
    receiverFare: { currency: 'sats', units: '7' },
  },
  covenantAddress: COVENANT_ADDRESS,
  fare: { currency: 'sats', units: '0' },
  receiverFare: { currency: 'sats', units: '7' },
  payer: 'receiver',
  unclaimedMode: 'reclaim',
  batchExpiry: { kind: 'time', value: '4000000000' },
  inputExpiryFloor: { kind: 'time', value: '4000000000' },
  recoveryLocktime: { kind: 'time', value: '3800000000' },
  createdAt: 1_000_000_000,
  expiresAt: 4_100_000_000,
}

export const withRule = (over: Record<string, unknown>) => ({
  ...INFO,
  assetRules: [{ ...INFO.assetRules[0], ...over }],
})

export const arkadeContext = (over: Partial<TaxiProbeContext> = {}): TaxiProbeContext => ({
  serverKey: hex.decode(KEYS.server),
  emulatorKey: hex.decode(KEYS.emulator),
  hrp: 'tark',
  dust: 330n,
  vtxoMinAmount: 1n,
  locktimeDomain: 'time',
  assetId: ASSET_ID,
  receiverAddress: RECEIVER_ADDRESS,
  fetch: taxiFetch(),
  pageProtocol: 'https:',
  ...over,
})

const reply = (body: unknown, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) })

/** A Taxi at TAXI_URL answering /v1/info and POST /v1/receive-quotes; anything else is a 404. */
export const taxiFetch = (over: { info?: unknown; quote?: unknown; quoteStatus?: number } = {}) =>
  vi.fn(async (url: string, init?: RequestInit) => {
    if (url === `${TAXI_URL}/v1/info`) return reply(over.info ?? INFO)
    if (url === `${TAXI_URL}/v1/receive-quotes` && init?.method === 'POST') {
      return reply(over.quote ?? QUOTE, over.quoteStatus)
    }
    return reply({ code: 'NOT_FOUND', message: url }, 404)
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>

export const unreachable = () =>
  vi.fn(async () => {
    throw new TypeError('Failed to fetch')
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>
