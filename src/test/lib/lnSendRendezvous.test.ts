// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { discover, sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { marketCorridor } from '@arkade-os/swap'
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
    expect(marketCorridor(markets[0], 'quote')).toBe('bolt11')
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
   * The bundled card predates `emulator_pubkey`. Offering a rendezvous anyway
   * would derive a covenant around a co-signer the solver does not use, and the
   * client would refuse to fund that address after burning a quote.
   *
   * Adding the field before `@arkade-os/solver-discovery` accepts it is a
   * different failure: the card validator is allow-list strict, so the whole
   * card is rejected and the corridor disappears. That shows up as warnings or
   * an empty market list in "survives discovery" above, not as a rendezvous.
   */
  it('has no rendezvous yet: the card carries no emulator_pubkey', async () => {
    expect(betaSolverCard).not.toHaveProperty('emulator_pubkey')
    const { markets } = await load()
    expect(lnSendRendezvous(markets)).toBeUndefined()
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
