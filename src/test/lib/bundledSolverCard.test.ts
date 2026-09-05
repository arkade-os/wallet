// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { discover, sideLimits, validateCard } from '@arkade-os/solver-discovery'
import betaSolverCard from '../../lib/beta-solver.card.json'

/**
 * The bundled solver card is the only thing that makes the Lightning-send
 * corridor exist — it is not in the solver registry yet. If discovery rejects
 * it (bad signature, missing rendezvous fields, unsupported shape) the failure
 * is SILENT: `discoverMarkets` returns no corridor, the client resolves no
 * route for a bolt11, and Lightning send simply is not offered. These tests
 * exist so that becomes a red test rather than a feature that quietly
 * vanished.
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
  it('carries no emulator_pubkey yet, which is what still gates the corridor', async () => {
    // The co-signer key is a covenant PARAMETER, so a market without one leaves
    // the client deriving against its own per-network pin. Pinned here because
    // the day the card carries one is the day this assertion should fail.
    expect(betaSolverCard).not.toHaveProperty('emulator_pubkey')
  })

  it('cannot carry emulator_pubkey until solver-discovery accepts it', async () => {
    // Pins blocker 2. When this flips to ok, bump the dep and add the field to
    // the card — the assertions above are what then start failing.
    const result = validateCard({ ...betaSolverCard, emulator_pubkey: 'c'.repeat(64) })
    expect(result.ok).toBe(false)
    expect(result.errors.join()).toMatch(/emulator_pubkey/)
  })
})
