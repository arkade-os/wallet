// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import {
  ONCHAIN_ROUTE_LOG,
  OnchainRouteUnavailable,
  onchainRouteRefusalText,
  onchainSendRendezvous,
  planOnchainSend,
  requestOnchainExit,
} from '../../lib/onchainSwap'

vi.mock('@arkade-os/swap', async () => {
  const actual = await vi.importActual<typeof import('@arkade-os/swap')>('@arkade-os/swap')
  return { ...actual, requestOnchainSend: (...args: unknown[]) => requestOnchainSendMock(...args) }
})

/** Swapped per test; the mock above is a stable indirection onto it. */
let requestOnchainSendMock: (...args: any[]) => any = () => {
  throw new Error('requestOnchainSend was not stubbed')
}

const EMULATOR = 'aa'.repeat(32)
const SOLVER = 'bb'.repeat(32)

/** A card's market as discovery hands it over. Only the fields the rendezvous
 * reads are real; the rest is the shape `DiscoveredMarket` demands. */
const market = (over: Partial<Record<string, unknown>> = {}): DiscoveredMarket =>
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

describe('onchainSendRendezvous', () => {
  it('selects a card whose onchain-side bounds contain the amount', () => {
    const choice = onchainSendRendezvous([market()], 50_000)
    expect(choice.ok).toBe(true)
    if (!choice.ok) return
    expect(choice.rendezvous.solverPubkey).toBe(SOLVER)
    expect(choice.rendezvous.minSats).toBe(1000)
    expect(choice.rendezvous.maxSats).toBe(1_000_000)
  })

  it('reads the bounds off the QUOTE side, which is what the solver pays out', () => {
    // Base-side bounds that would accept the amount, quote-side bounds that
    // must not. Reading the wrong side is invisible on a symmetric card, which
    // is why this one is deliberately lopsided.
    const choice = onchainSendRendezvous(
      [
        market({
          min_base_amount: '1',
          max_base_amount: '99999999',
          min_quote_amount: '1000',
          max_quote_amount: '2000',
        }),
      ],
      50_000,
    )
    expect(choice).toEqual({ ok: false, reason: 'amount_out_of_bounds', bounds: { minSats: 1000, maxSats: 2000 } })
  })

  it('does NOT select a card that serves the pair but not the size', () => {
    // The whole point of the size check: quoting here burns a negotiation and
    // leaks the trade for an answer the card already gave.
    const tooBig = onchainSendRendezvous([market()], 1_000_001)
    expect(tooBig).toEqual({ ok: false, reason: 'amount_out_of_bounds', bounds: { minSats: 1000, maxSats: 1_000_000 } })
    const tooSmall = onchainSendRendezvous([market()], 999)
    expect(tooSmall.ok).toBe(false)
  })

  it('includes both bounds, so the edges are quotable', () => {
    expect(onchainSendRendezvous([market()], 1000).ok).toBe(true)
    expect(onchainSendRendezvous([market()], 1_000_000).ok).toBe(true)
  })

  it('skips the card that cannot take the size and picks one that can', () => {
    const small = market({ min_quote_amount: '1', max_quote_amount: '999', discovery_pubkey: 'cc'.repeat(32) })
    const choice = onchainSendRendezvous([small, market()], 50_000)
    expect(choice.ok).toBe(true)
    if (choice.ok) expect(choice.rendezvous.solverPubkey).toBe(SOLVER)
  })

  it('reports no_solver when nothing advertises the corridor', () => {
    expect(onchainSendRendezvous([], 50_000)).toEqual({ ok: false, reason: 'no_solver' })
    const lightning = market({ quote_corridor: 'lightning' })
    expect(onchainSendRendezvous([lightning], 50_000)).toEqual({ ok: false, reason: 'no_solver' })
  })

  it('ignores the receive direction of the same corridor', () => {
    // onchain -> arkade. Funding this would be a different trade entirely.
    const receive = market({ base_corridor: 'onchain', quote_corridor: 'arkade' })
    expect(onchainSendRendezvous([receive], 50_000)).toEqual({ ok: false, reason: 'no_solver' })
  })

  it('skips a card with no rendezvous to address', () => {
    const noPubkey = onchainSendRendezvous([market({ discovery_pubkey: undefined })], 50_000)
    expect(noPubkey).toEqual({ ok: false, reason: 'no_solver' })
    const noRelays = onchainSendRendezvous([market({ transports: { nostr: { relays: [] } } })], 50_000)
    expect(noRelays).toEqual({ ok: false, reason: 'no_solver' })
  })

  it('treats a disabled side as no corridor, not as a 0..0 range', () => {
    // `max_quote_amount: "0"` is the registry's way of saying the solver
    // cannot pay this side out. Parsing the strings by hand would report it to
    // the user as "amount outside solver bounds" instead of "no solver".
    const disabled = market({ min_quote_amount: '0', max_quote_amount: '0' })
    expect(onchainSendRendezvous([disabled], 50_000)).toEqual({ ok: false, reason: 'no_solver' })
  })

  describe('the covenant co-signer key', () => {
    const pinned = Uint8Array.from({ length: 32 }, () => 0xaa)
    const other = Uint8Array.from({ length: 32 }, () => 0xcc)

    it('falls back to the pin for a card that predates the field', () => {
      const choice = onchainSendRendezvous([market({ emulator_pubkey: undefined })], 50_000, pinned)
      expect(choice.ok && choice.rendezvous.emulatorPubkey).toBe(EMULATOR)
    })

    it('fails closed on a malformed card key even with a pin', () => {
      const choice = onchainSendRendezvous([market({ emulator_pubkey: 'not-hex' })], 50_000, pinned)
      expect(choice).toEqual({ ok: false, reason: 'no_solver' })
    })

    it('skips a card whose key disagrees with the pin', () => {
      // A solver rotating its co-signer, or someone else serving the card.
      // Either way the covenant would derive differently and the funding would
      // pay a script this wallet never checked.
      expect(onchainSendRendezvous([market()], 50_000, other)).toEqual({ ok: false, reason: 'no_solver' })
    })

    it('requires a key from somewhere', () => {
      expect(onchainSendRendezvous([market({ emulator_pubkey: undefined })], 50_000)).toEqual({
        ok: false,
        reason: 'no_solver',
      })
    })
  })
})

describe('requestOnchainExit', () => {
  const result = (over: Record<string, unknown> = {}) => ({
    rfqId: 'rfq-1',
    address: 'tark1lockup',
    fundAmount: 50_000,
    quote: { to_amount: 49_500, valid_until: 9_999_999_999, refund_locktime: 123 },
    swapPkScript: new Uint8Array([1]),
    script: {} as never,
    refundAddress: 'tark1refund',
    htlc: { address: 'bcrt1htlc' },
    htlcParams: { paymentHash: 'ab'.repeat(32) },
    l1Network: 'regtest',
    minConfirmations: 1,
    senderPubkey: new Uint8Array([2]),
    secrets: {} as never,
    ...over,
  })

  const call = (over?: Record<string, unknown>) => {
    requestOnchainSendMock = () => result(over)
    return requestOnchainExit({
      wallet: {} as never,
      arkServerUrl: 'http://ark',
      transport: {} as never,
      amountSats: 50_000,
      payoutPubkey: new Uint8Array(32),
      rendezvous: {
        solverPubkey: SOLVER,
        transports: { nostr: { relays: [] } },
        emulatorPubkey: EMULATOR,
        minSats: 1,
        maxSats: 2,
      },
    })
  }

  it('returns what to fund and what will land', async () => {
    const request = await call()
    expect(request.address).toBe('tark1lockup')
    expect(request.fundAmount).toBe(50_000)
    expect(request.payoutAmount).toBe(49_500)
    expect(request.record.paymentHash).toBe('ab'.repeat(32))
  })

  it('refuses a quote that prices a different trade', async () => {
    // The package applies `assertQuotedAmount` on the receive legs only, so
    // without this the wallet would fund the solver's number rather than the
    // one the user agreed to.
    await expect(call({ fundAmount: 60_000 })).rejects.toThrow(/not the requested 50000/)
  })

  it('refuses a quote that pays out nothing, or more than it takes', async () => {
    await expect(call({ quote: { to_amount: 0, valid_until: 1, refund_locktime: 1 } })).rejects.toThrow(/unusable/)
    await expect(call({ quote: { to_amount: 50_000, valid_until: 1, refund_locktime: 1 } })).rejects.toThrow(/unusable/)
    await expect(call({ quote: { to_amount: 60_000, valid_until: 1, refund_locktime: 1 } })).rejects.toThrow(/unusable/)
  })
})

describe('planOnchainSend', () => {
  const base = {
    wallet: {} as never,
    arkServerUrl: 'http://ark',
    amountSats: 50_000,
    payoutPubkey: new Uint8Array(32),
    claimEndpoint: 'http://esplora/api',
    discover: async () => [market()],
    connect: <T>(_r: unknown, fn: (t: never) => Promise<T>) => fn({} as never),
  }

  const refusalOf = async (over: Partial<typeof base> = {}) => {
    try {
      await planOnchainSend({ ...base, ...over })
      return expect.unreachable('the solver route was taken')
    } catch (err) {
      expect(err).toBeInstanceOf(OnchainRouteUnavailable)
      return err as OnchainRouteUnavailable
    }
  }

  it('takes the solver route when a card can serve the size', async () => {
    requestOnchainSendMock = () => ({
      rfqId: 'rfq-1',
      address: 'tark1lockup',
      fundAmount: 50_000,
      quote: { to_amount: 49_500, valid_until: 9_999_999_999, refund_locktime: 1 },
      swapPkScript: new Uint8Array(),
      script: {} as never,
      refundAddress: 'tark1refund',
      htlc: { address: 'bcrt1htlc' },
      htlcParams: { paymentHash: 'ab'.repeat(32) },
      l1Network: 'regtest',
      minConfirmations: 1,
      senderPubkey: new Uint8Array(),
      secrets: {} as never,
    })
    const request = await planOnchainSend(base)
    expect(request.address).toBe('tark1lockup')
    expect(request.rendezvous.solverPubkey).toBe(SOLVER)
  })

  it('refuses before any network call when the wallet could not claim on L1', async () => {
    // The gate that keeps this feature from being worse than the exit it
    // replaces: a funded HTLC nobody can open.
    const discover = vi.fn(async () => [market()])
    const refusal = await refusalOf({ claimEndpoint: undefined, discover })
    expect(refusal.reason).toBe('no_l1_endpoint')
    expect(discover).not.toHaveBeenCalled()
  })

  it('reports no_solver rather than throwing something the caller cannot branch on', async () => {
    expect((await refusalOf({ discover: async () => [] })).reason).toBe('no_solver')
  })

  it('reports amount_out_of_bounds with the range that rejected it', async () => {
    const refusal = await refusalOf({ amountSats: 5 })
    expect(refusal.reason).toBe('amount_out_of_bounds')
    expect(refusal.bounds).toEqual({ minSats: 1000, maxSats: 1_000_000 })
  })

  it('turns a discovery failure into a fallback, not an error', async () => {
    const refusal = await refusalOf({
      discover: async () => {
        throw new Error('registry unreachable')
      },
    })
    expect(refusal.reason).toBe('discovery_failed')
    expect((refusal.cause as Error).message).toBe('registry unreachable')
  })

  it('turns a solver refusal into a fallback and names its reason code', async () => {
    // The reason code is the closed contract; the message is prose.
    requestOnchainSendMock = () => {
      const error = new Error('solver refused: amount_out_of_range') as Error & { reason: string }
      error.reason = 'amount_out_of_range'
      throw error
    }
    const refusal = await refusalOf()
    expect(refusal.reason).toBe('quote_failed')
    expect(refusal.message).toBe('solver route refused: amount_out_of_range')
  })

  it('turns a timeout into a fallback', async () => {
    requestOnchainSendMock = () => {
      throw new Error('Solver is not responding (waited 30s) — try again later')
    }
    const refusal = await refusalOf()
    expect(refusal.reason).toBe('quote_failed')
    expect(refusal.message).toMatch(/not responding/)
  })

  it('turns an unusable quote into a fallback', async () => {
    requestOnchainSendMock = () => ({
      rfqId: 'rfq-1',
      address: 'tark1lockup',
      fundAmount: 999,
      quote: { to_amount: 900, valid_until: 1, refund_locktime: 1 },
      htlc: { address: 'x' },
      htlcParams: { paymentHash: 'ab'.repeat(32) },
      l1Network: 'regtest',
      minConfirmations: 1,
      script: {} as never,
      secrets: {} as never,
      swapPkScript: new Uint8Array(),
      senderPubkey: new Uint8Array(),
      refundAddress: '',
    })
    expect((await refusalOf()).reason).toBe('quote_failed')
  })

  it('gives every refusal a message the send screen can show', () => {
    const reasons = ['no_solver', 'amount_out_of_bounds', 'no_l1_endpoint', 'discovery_failed', 'quote_failed'] as const
    for (const reason of reasons) {
      const text = onchainRouteRefusalText(new OnchainRouteUnavailable(reason, 'x'))
      expect(text).toMatch(/collaborative exit/)
    }
    const withBounds = onchainRouteRefusalText(
      new OnchainRouteUnavailable('amount_out_of_bounds', 'x', { bounds: { minSats: 10, maxSats: 20 } }),
    )
    expect(withBounds).toContain('10-20 sats')
  })

  it('keeps the log prefix stable, since it is the only trace of the decision', () => {
    expect(ONCHAIN_ROUTE_LOG).toBe('onchain send:')
  })
})
