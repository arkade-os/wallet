// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { SOLVER_ONCHAIN_RAIL } from '@arkade-os/swap'
import {
  ASSET_RAIL,
  createSendRouter,
  LIGHTNING_RAIL,
  lnSendRefusal,
  quoteIsForThisInvoice,
  quoteIsForThisSend,
  WALLET_EXIT_RAIL,
} from '../../lib/sendRouter'
import { onchainClaimEndpoint } from '../../lib/onchainPayout'
import { getEmulatorPubkeyForNetwork } from '../../lib/constants'
import fixtures from '../fixtures.json'

const collaborativeExitWithFees = vi.fn(async () => 'exit-txid')
const sendOffChain = vi.fn(async () => 'funding-txid')
const sendAssets = vi.fn(async () => 'asset-txid')
vi.mock('../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/asp')>()),
  collaborativeExitWithFees: (...args: unknown[]) => collaborativeExitWithFees(...(args as [])),
  sendOffChain: (...args: unknown[]) => sendOffChain(...(args as [])),
  sendAssets: (...args: unknown[]) => sendAssets(...(args as [])),
}))

const negotiated = () => ({
  rfqId: 'rfq-1',
  address: 'ark1lockup',
  fundAmount: 2_100,
  validUntil: Math.floor(Date.now() / 1000) + 60,
  rendezvous: {} as never,
  record: { paymentHash: 'ph', refundLocktime: 7, secrets: {} as never, script: {} as never },
})

/** The negotiation itself, stubbed — `lnSendRendezvous` is left real, since
 *  which solver it picks is the behaviour under test. */
const requestLnSend = vi.fn(async () => negotiated())
vi.mock('../../lib/lnSwap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/lnSwap')>()),
  requestLnSend: (...args: unknown[]) => requestLnSend(...(args as [])),
}))

/** `consoleError` persists to localStorage, which this environment has not. */
vi.mock('../../lib/logs', () => ({ consoleError: vi.fn(), consoleLog: vi.fn() }))

const connected = vi.fn()
vi.mock('../../lib/nostrRfq', () => ({
  withRfqTransport: async (rendezvous: unknown, fn: (t: unknown) => Promise<unknown>) => {
    connected(rendezvous)
    return fn({} as never)
  },
}))

const SOLVER = 'bb'.repeat(32)
/** The network's pinned key: a card that disagrees is skipped. */
const EMULATOR = hex.encode(getEmulatorPubkeyForNetwork('regtest')!)
const RECIPIENT = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'

const market = (over: Record<string, unknown> = {}): DiscoveredMarket =>
  ({
    pair: 'BTC/onchain:BTC',
    base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    base_corridor: 'arkade',
    quote_corridor: 'onchain',
    fee_bps: 10,
    min_base_amount: '1000',
    max_base_amount: '1000000',
    min_quote_amount: '1000',
    max_quote_amount: '1000000',
    discovery_pubkey: SOLVER,
    emulator_pubkey: EMULATOR,
    transports: { nostr: { relays: ['wss://relay.example'] } },
    ...over,
  }) as unknown as DiscoveredMarket

const router = (over: Partial<Parameters<typeof createSendRouter>[0]> = {}) =>
  createSendRouter({
    wallet: {} as never,
    arkServerUrl: 'http://ark.example',
    network: 'regtest',
    outputFee: () => 500,
    persist: async () => {},
    payoutPubkey: new Uint8Array(32),
    discover: async () => [market()],
    ...over,
  })

const railIds = async (r: ReturnType<typeof router>, amount = 50_000) =>
  (await r.options({ raw: RECIPIENT, amount })).map((o) => o.railId)

describe('the send router replaces the refusal enum with ranking', () => {
  it('ranks the solver ahead of the collaborative exit when both can take it', async () => {
    expect(await railIds(router())).toEqual([SOLVER_ONCHAIN_RAIL, WALLET_EXIT_RAIL])
  })

  // Each case is one arm of the `OnchainRouteRefusal` enum this deletes.
  it('drops the solver when no card serves the corridor (was: no_solver)', async () => {
    const r = router({ discover: async () => [] })
    expect(await railIds(r)).toEqual([WALLET_EXIT_RAIL])
  })

  it('drops the solver when a card serves the pair but not the size (was: amount_out_of_bounds)', async () => {
    const r = router({ discover: async () => [market()] })
    expect(await railIds(r, 5_000_000)).toEqual([WALLET_EXIT_RAIL])
  })

  it('drops the solver when discovery throws, and does NOT take the router down (was: discovery_failed)', async () => {
    const r = router({
      discover: async () => {
        throw new Error('registry unreachable')
      },
    })
    expect(await railIds(r)).toEqual([WALLET_EXIT_RAIL])
  })

  it('drops the solver for an address the claim could not pay to (was: unsupported_address)', async () => {
    const options = await router().options({ raw: 'bc1qqqqqqqq', amount: 50_000 })
    expect(options.map((o) => o.railId)).toEqual([WALLET_EXIT_RAIL])
  })

  it('registers the solver on mainnet — every network has a claim endpoint', async () => {
    // Both mainnet: a regtest address would drop the rail for the wrong reason.
    const mainnetCard = market({ emulator_pubkey: hex.encode(getEmulatorPubkeyForNetwork('bitcoin')!) })
    const r = router({ network: 'bitcoin', discover: async () => [mainnetCard] })
    const options = await r.options({ raw: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', amount: 50_000 })
    expect(options.map((o) => o.railId)).toEqual([SOLVER_ONCHAIN_RAIL, WALLET_EXIT_RAIL])
  })

  it('resolves a claim endpoint for every network the wallet can run on', () => {
    const networks = ['bitcoin', 'testnet', 'signet', 'mutinynet', 'regtest'] as const
    expect(networks.map((n) => Boolean(onchainClaimEndpoint(n)))).toEqual(networks.map(() => true))
  })
})

describe('the collaborative exit rail only claims on-chain targets', () => {
  it('does not match an ark address or an invoice', async () => {
    expect(await router().options({ raw: fixtures.lib.address.ark[0].address, amount: 50_000 })).toEqual([])
    expect(await router().options({ raw: fixtures.lib.bolt11.invoice, amount: 50_000 })).toEqual([])
  })
})

describe('quoteIsForThisSend: the wrong-address guard', () => {
  // The regression this replaces (1b3481b): sign -> back -> retype -> continue
  // paid the FIRST recipient.
  const screen = { destination: RECIPIENT, satoshis: 9_500, total: 10_000 }
  const quote = { amount: 9_500, total: 10_000 }
  const OTHER = 'bcrt1pq6gt72nxevsxk5fwl3h2sx56jeah6qfzh98mksxyakkg5l0q65gsa27khh'

  it('funds a quote for the send the screen is showing', () => {
    expect(quoteIsForThisSend(quote, screen, RECIPIENT)).toBe(true)
  })

  it('refuses when the screen is showing a DIFFERENT address than was routed to', () => {
    expect(quoteIsForThisSend(quote, { ...screen, destination: OTHER }, RECIPIENT)).toBe(false)
    expect(quoteIsForThisSend(quote, screen, OTHER)).toBe(false)
  })

  it('refuses a quote that pays the recipient something else', () => {
    expect(quoteIsForThisSend({ ...quote, amount: 9_000 }, screen, RECIPIENT)).toBe(false)
  })

  it('refuses a quote that spends more than the screen displayed', () => {
    expect(quoteIsForThisSend({ ...quote, total: 10_001 }, screen, RECIPIENT)).toBe(false)
  })

  it('allows a quote that spends LESS — the user is charged under what was shown', () => {
    expect(quoteIsForThisSend({ ...quote, total: 9_800 }, screen, RECIPIENT)).toBe(true)
  })

  it('refuses a screen with no destination or amount at all', () => {
    expect(quoteIsForThisSend(quote, {}, RECIPIENT)).toBe(false)
    expect(quoteIsForThisSend(quote, { destination: RECIPIENT }, RECIPIENT)).toBe(false)
  })
})

describe('the collaborative exit rail', () => {
  it('spends what the old call spent: payout out, payout+fee in', async () => {
    const options = await router({ discover: async () => [] }).options({ raw: RECIPIENT, amount: 9_500 })
    const quote = await options[0].quote()

    expect(quote).toMatchObject({ railId: WALLET_EXIT_RAIL, amount: 9_500, fee: 500, total: 10_000 })

    await quote.send()
    // 10_000 leaves, the recipient gets 9_500 — exactly as before the router.
    expect(collaborativeExitWithFees).toHaveBeenCalledWith(expect.anything(), 10_000, 9_500, RECIPIENT)
  })
})

const INVOICE = fixtures.lib.bolt11.invoice
const INVOICE_SATS = fixtures.lib.bolt11.amountSats
const ARK_ADDRESS = fixtures.lib.address.ark[0].address

const lnMarket = (over: Record<string, unknown> = {}) =>
  market({ pair: 'BTC/lightning:BTC', quote_corridor: 'lightning', ...over })

const track = vi.fn(async () => {})

const lnRouter = (over: Partial<Parameters<typeof createSendRouter>[0]> = {}) =>
  createSendRouter({
    wallet: {} as never,
    arkServerUrl: 'http://ark.example',
    network: 'regtest',
    track,
    discover: async () => [lnMarket()],
    ...over,
  })

const lnQuote = async (over: Partial<Parameters<typeof createSendRouter>[0]> = {}) => {
  const options = await lnRouter(over).options({ raw: INVOICE, amount: INVOICE_SATS })
  return options[0].quote()
}

describe('the lightning rail replaces the send form’s own solver pick', () => {
  beforeEach(() => {
    requestLnSend.mockClear()
    sendOffChain.mockClear()
    track.mockClear()
    connected.mockClear()
  })

  it('takes an invoice and leaves the other targets alone', async () => {
    expect((await lnRouter().options({ raw: INVOICE, amount: INVOICE_SATS })).map((o) => o.railId)).toEqual([
      LIGHTNING_RAIL,
    ])
    expect(await lnRouter().options({ raw: RECIPIENT, amount: INVOICE_SATS })).toEqual([])
    expect(await lnRouter().options({ raw: ARK_ADDRESS, amount: INVOICE_SATS })).toEqual([])
  })

  it('drops itself when no card serves the corridor (was: no solver)', async () => {
    expect(await lnRouter({ discover: async () => [] }).options({ raw: INVOICE, amount: INVOICE_SATS })).toEqual([])
    // The on-chain corridor is not the Lightning one, however well it quotes.
    expect(
      await lnRouter({ discover: async () => [market()] }).options({ raw: INVOICE, amount: INVOICE_SATS }),
    ).toEqual([])
  })

  it('drops itself for a size the one solver will not take (was: outside solver bounds)', async () => {
    expect(await lnRouter().options({ raw: INVOICE, amount: 999 })).toEqual([])
    expect(await lnRouter().options({ raw: INVOICE, amount: 1_000_001 })).toEqual([])
  })

  it('drops itself when discovery throws, and does NOT take the router down', async () => {
    const r = lnRouter({
      discover: async () => {
        throw new Error('registry unreachable')
      },
    })
    expect(await r.options({ raw: INVOICE, amount: INVOICE_SATS })).toEqual([])
  })

  it('skips a card whose co-signer key disagrees with the pin — the rule the form applied', async () => {
    const r = lnRouter({ discover: async () => [lnMarket({ emulator_pubkey: 'cc'.repeat(32) })] })
    expect(await r.options({ raw: INVOICE, amount: INVOICE_SATS })).toEqual([])
  })

  it('negotiates with the card’s own solver, over the card’s own relays', async () => {
    await lnQuote()
    expect(connected).toHaveBeenCalledWith(
      expect.objectContaining({ solverPubkey: SOLVER, transports: { nostr: { relays: ['wss://relay.example'] } } }),
    )
    expect(requestLnSend).toHaveBeenCalledWith(expect.objectContaining({ invoice: INVOICE, network: 'regtest' }))
  })

  it('quotes the invoice amount, with the solver’s spread as the fee on top', async () => {
    expect(await lnQuote()).toMatchObject({
      railId: LIGHTNING_RAIL,
      amount: INVOICE_SATS,
      fee: 2_100 - INVOICE_SATS,
      total: 2_100,
      meta: { rfqId: 'rfq-1', invoice: INVOICE },
    })
  })

  it('funds the lockup and records the swap WITH its funding txid', async () => {
    const quote = await lnQuote()
    const result = await (await quote.send()).settled()

    expect(sendOffChain).toHaveBeenCalledWith(expect.anything(), 2_100, 'ark1lockup')
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        rfqId: 'rfq-1',
        lockupAddress: 'ark1lockup',
        amount: 2_100,
        fundingTxid: 'funding-txid',
        paymentHash: 'ph',
        refundLocktime: 7,
      }),
    )
    expect(result).toMatchObject({ railId: LIGHTNING_RAIL, txid: 'funding-txid', swapId: 'rfq-1' })
  })

  it('records the swap only once the covenant is funded', async () => {
    const order: string[] = []
    sendOffChain.mockImplementationOnce(async () => {
      order.push('fund')
      return 'funding-txid'
    })
    track.mockImplementationOnce(async () => {
      order.push('track')
    })
    await (await (await lnQuote()).send()).settled()
    expect(order).toEqual(['fund', 'track'])
  })

  it('does not fail a funded send because the store refused the record', async () => {
    track.mockRejectedValueOnce(new Error('quota exceeded'))
    const result = await (await (await lnQuote()).send()).settled()
    expect(result).toMatchObject({ txid: 'funding-txid' })
  })

  it('refuses to fund an expired quote, and funds nothing', async () => {
    requestLnSend.mockResolvedValueOnce({ ...negotiated(), validUntil: Math.floor(Date.now() / 1000) - 1 })
    const quote = await lnQuote()
    await expect((await quote.send()).settled()).rejects.toThrow(/Quote expired/)
    expect(sendOffChain).not.toHaveBeenCalled()
  })
})

describe('lnSendRefusal names which of the two refusals it was', () => {
  it('says no solver when nothing serves the corridor', () => {
    expect(lnSendRefusal([], 'regtest')).toBe('No Lightning solver available')
    expect(lnSendRefusal([market()], 'regtest')).toBe('No Lightning solver available')
  })

  it('quotes the card’s own bounds when a solver serves it at another size', () => {
    expect(lnSendRefusal([lnMarket()], 'regtest')).toBe('Amount outside solver bounds (1,000-1,000,000 sats)')
  })
})

describe('quoteIsForThisInvoice: the wrong-invoice guard', () => {
  it('funds a quote negotiated for the invoice on screen', () => {
    expect(quoteIsForThisInvoice({ meta: { invoice: INVOICE } }, INVOICE)).toBe(true)
  })

  it('refuses a quote negotiated for another invoice, or for none at all', () => {
    expect(quoteIsForThisInvoice({ meta: { invoice: 'lnbc1other' } }, INVOICE)).toBe(false)
    expect(quoteIsForThisInvoice({ meta: undefined }, INVOICE)).toBe(false)
  })

  // A BIP21 `lightning=` param keeps whatever it was handed; the rail routed
  // the stripped invoice, so an unstripped screen value is the same payment.
  it('funds the same invoice however the screen is carrying it', () => {
    expect(quoteIsForThisInvoice({ meta: { invoice: INVOICE } }, `lightning:${INVOICE}`)).toBe(true)
    expect(quoteIsForThisInvoice({ meta: { invoice: INVOICE } }, `bitcoin:bcrt1q?lightning=${INVOICE}`)).toBe(true)
  })

  it('refuses when the screen carries no invoice at all', () => {
    expect(quoteIsForThisInvoice({ meta: { invoice: INVOICE } }, '')).toBe(false)
    expect(quoteIsForThisInvoice({ meta: undefined }, '')).toBe(false)
  })
})

describe('the asset rail', () => {
  const assets = [{ assetId: 'usdt', amount: BigInt(500) }]

  const assetRouter = (over: Partial<Parameters<typeof createSendRouter>[0]> = {}) =>
    createSendRouter({
      wallet: {} as never,
      arkServerUrl: 'http://ark.example',
      network: 'regtest',
      assets,
      ...over,
    })

  beforeEach(() => sendAssets.mockClear())

  it('takes an ark address and nothing else', async () => {
    expect((await assetRouter().options({ raw: ARK_ADDRESS })).map((o) => o.railId)).toEqual([ASSET_RAIL])
    expect(await assetRouter().options({ raw: RECIPIENT })).toEqual([])
    expect(await assetRouter().options({ raw: INVOICE })).toEqual([])
  })

  it('drops itself when there is nothing to send', async () => {
    expect(await assetRouter({ assets: [] }).options({ raw: ARK_ADDRESS })).toEqual([])
  })

  it('sends what the old call sent: the whole list, to the ark address', async () => {
    const quote = await (await assetRouter().options({ raw: ARK_ADDRESS }))[0].quote()
    expect(quote).toMatchObject({ railId: ASSET_RAIL, amount: 0 })

    const result = await (await quote.send()).settled()
    expect(sendAssets).toHaveBeenCalledWith(expect.anything(), ARK_ADDRESS, assets)
    expect(result).toMatchObject({ railId: ASSET_RAIL, txid: 'asset-txid' })
  })
})
