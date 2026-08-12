// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { discover, sideLimits, validateCard, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import betaSolverCard from '../../lib/beta-solver.card.json'
import { lnSendRendezvous } from '../../lib/lnSwap'

/**
 * The bundled solver card is the only thing that makes the Lightning-send
 * corridor exist — it is not in the solver registry yet. If discovery rejects
 * it (bad signature, missing rendezvous fields, unsupported shape) the failure
 * is SILENT: `discoverMarkets` returns no corridor, `lnSendRendezvous` returns
 * undefined, and Lightning send simply is not offered. These tests exist so
 * that becomes a red test rather than a feature that quietly vanished.
 */
describe('bundled Arkade Labs solver card', () => {
  const load = async () =>
    discover({
      registries: [],
      localCards: [{ card: betaSolverCard as never, network: 'bitcoin' }],
      network: 'bitcoin',
    })

  it('survives discovery and yields a lightning corridor market', async () => {
    const { markets, warnings } = await load()
    expect(warnings).toEqual([])
    expect(markets).toHaveLength(1)
    expect(markets[0].quote_corridor).toBe('lightning')
  })

  it('carries the rendezvous through discovery, so the maker can address the solver', async () => {
    // discovery_pubkey and the transports map live on the CARD; the market is
    // what the wallet actually holds, so the reducer has to propagate them or
    // the negotiation has no counterparty and no relay to reach it on.
    const { markets } = await load()
    expect(markets[0].discovery_pubkey).toBe(betaSolverCard.discovery_pubkey)
    expect(markets[0].transports?.nostr?.relays).toEqual(betaSolverCard.transports.nostr.relays)
  })

  it('reports the card bounds on the Lightning side', async () => {
    const { markets } = await load()
    expect(sideLimits(markets[0], 'quote')?.min).toBe(BigInt(betaSolverCard.markets[0].min_quote_amount))
    expect(sideLimits(markets[0], 'quote')?.max).toBe(BigInt(betaSolverCard.markets[0].max_quote_amount))
  })

  /**
   * The card predates `emulator_pubkey` and cannot yet carry it, so the
   * corridor is deliberately unavailable rather than negotiable-but-unfundable.
   *
   * Both halves below are blockers OUTSIDE this repo, and each is pinned by a
   * test so the day it lifts is a red test rather than a discovery:
   *
   *  1. The solver must publish a card carrying its `emulator_pubkey`
   *     (`cli card` already emits one — arkade-os/solver-registry#18).
   *  2. `@arkade-os/solver-discovery` must ship a release that ACCEPTS that
   *     field on a card and propagates it onto the market. At the pinned 0.2.2
   *     it does neither, and its card validator is allow-list strict, so adding
   *     the field early would not degrade — it would reject the whole card and
   *     take the corridor with it.
   *
   * Until both land the wallet declines the corridor up front, which beats
   * quoting: a covenant derived without the solver's real co-signer key is a
   * different address, so the client would refuse to fund it anyway — after
   * burning a quote and handing the invoice to a third party for nothing.
   */
  it('has no rendezvous yet: the card carries no emulator_pubkey', async () => {
    expect(betaSolverCard).not.toHaveProperty('emulator_pubkey')
    const { markets } = await load()
    expect(lnSendRendezvous(markets)).toBeUndefined()
  })

  it('cannot carry emulator_pubkey until solver-discovery accepts it', async () => {
    // Pins blocker 2. When this flips to ok, bump the dep and add the field to
    // the card — the assertions above are what then start failing.
    const result = validateCard({ ...betaSolverCard, emulator_pubkey: 'c'.repeat(64) })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toMatch(/emulator_pubkey/)
  })
})

describe('lnSendRendezvous', () => {
  // Only the corridor, the rendezvous and the quote-side bounds take part in
  // the selection; the rest of DiscoveredMarket is irrelevant to it, so these
  // cases carry just those fields rather than a full market fixture.
  const market = (overrides: Record<string, unknown> = {}): DiscoveredMarket =>
    ({
      quote_corridor: 'lightning',
      discovery_pubkey: 'aa'.repeat(32),
      emulator_pubkey: 'cc'.repeat(32),
      transports: { nostr: { relays: ['wss://relay.test'] } },
      min_quote_amount: '500',
      max_quote_amount: '1000',
      ...overrides,
    }) as unknown as DiscoveredMarket

  it('skips markets that are not the lightning corridor', () => {
    expect(lnSendRendezvous([market({ quote_corridor: 'onchain' })])).toBeUndefined()
  })

  it('skips a corridor market with no rendezvous rather than trusting it', () => {
    // The registry signs the pubkey and the transports map; a corridor market
    // reaching us without them is malformed, and guessing a counterparty is
    // not an option. A transports map that names only protocols we do not
    // speak is the same thing: no way to reach the solver.
    expect(lnSendRendezvous([market({ discovery_pubkey: undefined })])).toBeUndefined()
    expect(lnSendRendezvous([market({ transports: undefined })])).toBeUndefined()
    expect(lnSendRendezvous([market({ transports: { nostr: { relays: [] } } })])).toBeUndefined()
    expect(lnSendRendezvous([market({ transports: { somethingElse: { relays: ['wss://x'] } } })])).toBeUndefined()
  })

  it('skips a corridor market with no usable emulator_pubkey', () => {
    // The co-signer key is a covenant PARAMETER — two of the eight leaves are
    // built around it — so without a well-formed one the wallet cannot derive
    // the lockup, and cannot check the solver's address against its own. Every
    // malformed shape lands on the same answer as a missing one: no corridor.
    expect(lnSendRendezvous([market({ emulator_pubkey: undefined })])).toBeUndefined()
    expect(lnSendRendezvous([market({ emulator_pubkey: '' })])).toBeUndefined()
    expect(lnSendRendezvous([market({ emulator_pubkey: 'deadbeef' })])).toBeUndefined()
    // 33-byte compressed key, not the 32-byte x-only one the covenant takes.
    expect(lnSendRendezvous([market({ emulator_pubkey: `02${'cc'.repeat(32)}` })])).toBeUndefined()
    // Uppercase is off-pattern for the registry, and hex.decode rejects it.
    expect(lnSendRendezvous([market({ emulator_pubkey: 'CC'.repeat(32) })])).toBeUndefined()
    // A URL is the specific confusion this corridor already shipped once.
    expect(lnSendRendezvous([market({ emulator_pubkey: 'https://not-a-pubkey.example' })])).toBeUndefined()
  })

  it('carries the emulator pubkey through, so the covenant can be derived', () => {
    expect(lnSendRendezvous([market()])?.emulatorPubkey).toBe('cc'.repeat(32))
  })

  it('treats a disabled quote side as no solver, not a zero-width range', () => {
    // max "0" means the solver cannot pay that side out. Reporting it as
    // bounds 0..0 would tell the user their amount is out of range.
    expect(lnSendRendezvous([market({ max_quote_amount: '0' })])).toBeUndefined()
  })

  it('returns undefined when nothing serves the corridor', () => {
    expect(lnSendRendezvous([])).toBeUndefined()
  })

  it('picks the first market that serves the corridor with a rendezvous', () => {
    const rendezvous = lnSendRendezvous([market({ quote_corridor: 'onchain' }), market()])
    expect(rendezvous?.solverPubkey).toBe('aa'.repeat(32))
  })
})
