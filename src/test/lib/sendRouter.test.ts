// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { hex } from '@scure/base'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { SOLVER_ONCHAIN_RAIL } from '@arkade-os/swap'
import { createSendRouter, quoteIsForThisSend, WALLET_EXIT_RAIL } from '../../lib/sendRouter'
import { onchainClaimEndpoint } from '../../lib/onchainPayout'
import { getEmulatorPubkeyForNetwork } from '../../lib/constants'
import fixtures from '../fixtures.json'

const collaborativeExitWithFees = vi.fn(async () => 'exit-txid')
vi.mock('../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/asp')>()),
  collaborativeExitWithFees: (...args: unknown[]) => collaborativeExitWithFees(...(args as [])),
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
