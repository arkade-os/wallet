// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { ONCHAIN_SWAP_RAIL, claimFeeSats, type SwapRailClient } from '@arkade-os/swap'
import {
  ASSET_RAIL,
  createSendRouter,
  LIGHTNING_RAIL,
  lnSendRefusal,
  quoteIsForThisInvoice,
  quoteIsForThisSend,
  WALLET_EXIT_RAIL,
} from '../../lib/sendRouter'
import { decodeInvoice } from '../../lib/bolt11'
import fixtures from '../fixtures.json'

const collaborativeExitWithFees = vi.fn(async () => 'exit-txid')
const sendAssets = vi.fn(async () => 'asset-txid')
vi.mock('../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/asp')>()),
  collaborativeExitWithFees: (...args: unknown[]) => collaborativeExitWithFees(...(args as [])),
  sendAssets: (...args: unknown[]) => sendAssets(...(args as [])),
}))

/** `consoleError` persists to localStorage, which this environment has not. */
vi.mock('../../lib/logs', () => ({ consoleError: vi.fn(), consoleLog: vi.fn() }))

const RECIPIENT = 'bcrt1qv9zftxjdep9x3sq85aguvd3d4n7dj4ytnf4ez7'
const INVOICE = fixtures.lib.bolt11.invoice
const INVOICE_SATS = fixtures.lib.bolt11.amountSats
const ARK_ADDRESS = fixtures.lib.address.ark[0].address
const PAYMENT_HASH = decodeInvoice(INVOICE).paymentHash

const CLAIM_RATE = 4
const CLAIM_FEE = claimFeeSats({ claimFeeRateSatVb: CLAIM_RATE })
const SPREAD = BigInt(70)

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
    ...over,
  }) as unknown as DiscoveredMarket

const lnMarket = (over: Record<string, unknown> = {}) =>
  market({ pair: 'BTC/lightning:BTC', quote_corridor: 'lightning', ...over })

const accept = vi.fn()
const quoted = vi.fn()

/** `onUpdate` replays synchronously, so `swapHandle` settles without a timer. */
const fakeClient = (over: Partial<SwapRailClient> & { outcome?: string; fundingTxid?: string } = {}) => {
  const { outcome = 'paid', fundingTxid = 'funding-txid', ...rest } = over
  const client = {
    resolve: vi.fn(async () => ({ eligible: 1 })),
    quote: vi.fn(async (input: { amount?: bigint; amountOn?: string }) => {
      quoted(input)
      const take = input.amount ?? BigInt(0)
      return {
        id: 'quote-1',
        expiresAt: Math.floor(Date.now() / 1000) + 60,
        market: { key: 'market-1' },
        lock: { hash: PAYMENT_HASH },
        take: { amount: take },
        fee: { amount: SPREAD },
        give: { amount: take + SPREAD },
      }
    }),
    accept: vi.fn(async (q: unknown) => {
      accept(q)
      return { id: 'swap-1', fundingTxid }
    }),
    onUpdate: (fn: (u: unknown) => void) => {
      fn({ outcome, swap: { id: 'swap-1', fundingTxid } })
      return () => {}
    },
    ...rest,
  }
  return client as unknown as SwapRailClient
}

const router = (over: Partial<Parameters<typeof createSendRouter>[0]> = {}) =>
  createSendRouter({
    wallet: {} as never,
    client: fakeClient(),
    claimFeeRateSatVb: CLAIM_RATE,
    outputFee: () => 500,
    ...over,
  })

const railIds = async (r: ReturnType<typeof router>, raw = RECIPIENT, amount: number | undefined = 50_000) =>
  (await r.options({ raw, amount })).map((o) => o.railId)

beforeEach(() => {
  collaborativeExitWithFees.mockClear()
  sendAssets.mockClear()
  accept.mockClear()
  quoted.mockClear()
})

describe('the send router replaces the refusal enum with ranking', () => {
  it('ranks the solver ahead of the collaborative exit when both can take it', async () => {
    expect(await railIds(router())).toEqual([ONCHAIN_SWAP_RAIL, WALLET_EXIT_RAIL])
  })

  it('drops the solver when no card serves the corridor (was: no_solver)', async () => {
    const client = fakeClient({ resolve: vi.fn(async () => ({ eligible: 0 })) as never })
    expect(await railIds(router({ client }))).toEqual([WALLET_EXIT_RAIL])
  })

  it('drops the solver for a payout under the dust the claim is built against', async () => {
    expect(await railIds(router(), RECIPIENT, 300)).toEqual([WALLET_EXIT_RAIL])
  })

  it('drops the solver when the route cannot be resolved, and does NOT take the router down', async () => {
    const client = fakeClient({
      resolve: vi.fn(async () => {
        throw Object.assign(new Error('no route'), { name: 'UnsupportedRoute' })
      }) as never,
    })
    expect(await railIds(router({ client }))).toEqual([WALLET_EXIT_RAIL])
  })

  it('registers no solver rail in a tab that is not driving the client', async () => {
    expect(await railIds(router({ client: undefined }))).toEqual([WALLET_EXIT_RAIL])
  })

  it('registers no solver rail without a claim fee rate — it would quote a fee it does not charge', async () => {
    expect(await railIds(router({ claimFeeRateSatVb: undefined }))).toEqual([WALLET_EXIT_RAIL])
  })
})

describe('the collaborative exit rail only claims on-chain targets', () => {
  it('does not match an ark address or an invoice', async () => {
    const exitOnly = router({ client: undefined })
    expect(await exitOnly.options({ raw: ARK_ADDRESS, amount: 50_000 })).toEqual([])
    expect(await exitOnly.options({ raw: INVOICE, amount: 50_000 })).toEqual([])
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
    const options = await router({ client: undefined }).options({ raw: RECIPIENT, amount: 9_500 })
    const quote = await options[0].quote()

    expect(quote).toMatchObject({ railId: WALLET_EXIT_RAIL, amount: 9_500, fee: 500, total: 10_000 })

    await quote.send()
    // 10_000 leaves, the recipient gets 9_500 — exactly as before the router.
    expect(collaborativeExitWithFees).toHaveBeenCalledWith(expect.anything(), 10_000, 9_500, RECIPIENT)
  })
})

describe('the solver on-chain rail', () => {
  const solverQuote = async (amount = 50_000) => {
    const options = await router().options({ raw: RECIPIENT, amount })
    return options[0].quote()
  }

  it('asks the solver for the payout PLUS the claim fee, so what lands is what was asked for', async () => {
    const quote = await solverQuote(50_000)
    expect(quoted).toHaveBeenCalledWith(
      expect.objectContaining({ amount: BigInt(50_000) + CLAIM_FEE, amountOn: 'take' }),
    )
    // The claim comes out of the HTLC output, so it is a fee the user pays.
    expect(quote).toMatchObject({
      railId: ONCHAIN_SWAP_RAIL,
      amount: 50_000,
      fee: Number(SPREAD + CLAIM_FEE),
      total: 50_000 + Number(SPREAD + CLAIM_FEE),
    })
  })

  /** `accept()` persists then funds; this pins that nothing funds around it. */
  it('funds only through accept(), and carries the funding txid back', async () => {
    const quote = await solverQuote()
    const result = await (await quote.send()).settled()

    expect(accept).toHaveBeenCalledTimes(1)
    expect(collaborativeExitWithFees).not.toHaveBeenCalled()
    expect(result).toMatchObject({ railId: ONCHAIN_SWAP_RAIL, txid: 'funding-txid' })
  })

  /** The gross-up is only as good as the solver's answer, so these pin what
   *  happens when the take leg is not what was asked for. */
  it('a short take leg lands under the screen, where the wrong-send guard refuses it', async () => {
    const short = fakeClient({
      quote: vi.fn(async (input: { amount?: bigint }) => {
        const take = (input.amount ?? BigInt(0)) - BigInt(1_000)
        return {
          id: 'q',
          expiresAt: 0,
          market: { key: 'm' },
          take: { amount: take },
          fee: { amount: SPREAD },
          give: { amount: take + SPREAD },
        }
      }) as never,
    })
    const options = await router({ client: short }).options({ raw: RECIPIENT, amount: 50_000 })
    const quote = await options[0].quote()

    expect(quote.amount).toBe(49_000)
    const screen = { destination: RECIPIENT, satoshis: 50_000, total: 50_000 + Number(SPREAD + CLAIM_FEE) }
    expect(quoteIsForThisSend(quote, screen, RECIPIENT)).toBe(false)
  })

  it('refuses outright when the quote legs do not add up', async () => {
    const inconsistent = fakeClient({
      quote: vi.fn(async (input: { amount?: bigint }) => ({
        id: 'q',
        expiresAt: 0,
        market: { key: 'm' },
        take: { amount: input.amount ?? BigInt(0) },
        fee: { amount: SPREAD },
        // give must equal take + fee; a solver that says otherwise is refused
        give: { amount: (input.amount ?? BigInt(0)) + SPREAD + BigInt(500) },
      })) as never,
    })
    const options = await router({ client: inconsistent }).options({ raw: RECIPIENT, amount: 50_000 })
    await expect(options[0].quote()).rejects.toThrow()
  })

  it('reports a refused acceptance as a failure and funds nothing', async () => {
    const client = fakeClient({
      accept: vi.fn(async () => {
        throw new Error('solver withdrew')
      }) as never,
    })
    const options = await router({ client }).options({ raw: RECIPIENT, amount: 50_000 })
    const quote = await options[0].quote()
    await expect((await quote.send()).settled()).rejects.toThrow('solver withdrew')
    expect(collaborativeExitWithFees).not.toHaveBeenCalled()
  })
})

describe('the lightning rail', () => {
  it('takes an invoice and leaves the other targets alone', async () => {
    expect(await railIds(router(), INVOICE, INVOICE_SATS)).toEqual([LIGHTNING_RAIL])
    expect(await railIds(router(), ARK_ADDRESS, 50_000)).toEqual([])
  })

  it('drops itself when nothing serves the corridor (was: no solver)', async () => {
    const client = fakeClient({ resolve: vi.fn(async () => ({ eligible: 0 })) as never })
    expect(await railIds(router({ client }), INVOICE, INVOICE_SATS)).toEqual([])
  })

  it('quotes the invoice amount with the solver spread on top, and funds through accept()', async () => {
    const options = await router().options({ raw: INVOICE, amount: INVOICE_SATS })
    const quote = await options[0].quote()
    expect(quote).toMatchObject({ railId: LIGHTNING_RAIL, fee: Number(SPREAD) })

    const result = await (await quote.send()).settled()
    expect(accept).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ railId: LIGHTNING_RAIL, txid: 'funding-txid' })
  })
})

describe('lnSendRefusal names which of the two refusals it was', () => {
  it('says no solver when nothing serves the corridor', () => {
    expect(lnSendRefusal([])).toBe('No Lightning solver available')
    expect(lnSendRefusal([market()])).toBe('No Lightning solver available')
  })

  it('quotes the card’s own bounds when a solver serves it at another size', () => {
    expect(lnSendRefusal([lnMarket()])).toBe('Amount outside solver bounds (1,000-1,000,000 sats)')
  })
})

describe('quoteIsForThisInvoice: the wrong-invoice guard', () => {
  // The v2 rail's meta carries `quote.lock.hash` and never the BOLT11, so a
  // guard reading `meta.invoice` would refuse every send instead of a wrong one.
  const meta = { meta: { paymentHash: PAYMENT_HASH } }

  it('funds a quote negotiated for the invoice on screen', () => {
    expect(quoteIsForThisInvoice(meta, INVOICE)).toBe(true)
  })

  it('refuses a quote negotiated for another invoice, or for none at all', () => {
    expect(quoteIsForThisInvoice({ meta: { paymentHash: 'ab'.repeat(32) } }, INVOICE)).toBe(false)
    expect(quoteIsForThisInvoice({ meta: undefined }, INVOICE)).toBe(false)
    expect(quoteIsForThisInvoice({ meta: {} }, INVOICE)).toBe(false)
  })

  it('matches the hash however the rail cased it', () => {
    expect(quoteIsForThisInvoice({ meta: { paymentHash: PAYMENT_HASH.toUpperCase() } }, INVOICE)).toBe(true)
  })

  // A BIP21 `lightning=` param keeps whatever it was handed; the rail routed
  // the stripped invoice, so an unstripped screen value is the same payment.
  it('funds the same invoice however the screen is carrying it', () => {
    expect(quoteIsForThisInvoice(meta, `lightning:${INVOICE}`)).toBe(true)
    expect(quoteIsForThisInvoice(meta, `bitcoin:bcrt1q?lightning=${INVOICE}`)).toBe(true)
  })

  it('refuses when the screen carries no invoice at all', () => {
    expect(quoteIsForThisInvoice(meta, '')).toBe(false)
    expect(quoteIsForThisInvoice({ meta: undefined }, '')).toBe(false)
  })
})

describe('the asset rail', () => {
  const assets = [{ assetId: 'usdt', amount: BigInt(500) }]

  const assetRouter = (over: Partial<Parameters<typeof createSendRouter>[0]> = {}) =>
    createSendRouter({ wallet: {} as never, assets, ...over })

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
