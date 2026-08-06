// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { discover } from '@arkade-os/solver-discovery'
import arklabsCard from '../../lib/swap/arklabs-lightning.card.json'
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
    discover({ registries: [], localCards: [{ card: arklabsCard as never, network: 'bitcoin' }], network: 'bitcoin' })

  it('survives discovery and yields a lightning corridor market', async () => {
    const { markets, warnings } = await load()
    expect(warnings).toEqual([])
    expect(markets).toHaveLength(1)
    expect(markets[0].quote_corridor).toBe('lightning')
  })

  it('carries the rendezvous through discovery, so the maker can address the solver', async () => {
    // discovery_pubkey and relays live on the CARD; the market is what the
    // wallet actually holds, so the reducer has to propagate them or the
    // negotiation has no counterparty and no relay to reach it on.
    const { markets } = await load()
    const rendezvous = lnSendRendezvous(markets)
    expect(rendezvous).toBeDefined()
    expect(rendezvous?.solverPubkey).toBe(arklabsCard.discovery_pubkey)
    expect(rendezvous?.relays).toEqual(arklabsCard.relays)
  })

  it('reports the card bounds on the Lightning side', async () => {
    const { markets } = await load()
    const rendezvous = lnSendRendezvous(markets)
    expect(rendezvous?.minSats).toBe(Number(arklabsCard.markets[0].min_quote_amount))
    expect(rendezvous?.maxSats).toBe(Number(arklabsCard.markets[0].max_quote_amount))
  })
})

describe('lnSendRendezvous', () => {
  const good = {
    quote_corridor: 'lightning',
    discovery_pubkey: 'aa'.repeat(32),
    relays: ['wss://relay.test'],
    min_quote_amount: '500',
    max_quote_amount: '1000',
  }

  it('skips markets that are not the lightning corridor', () => {
    expect(lnSendRendezvous([{ ...good, quote_corridor: 'onchain' }])).toBeUndefined()
  })

  it('skips a corridor market with no rendezvous rather than trusting it', () => {
    // The registry signs the pubkey and relays; a corridor market reaching us
    // without them is malformed, and guessing a counterparty is not an option.
    expect(lnSendRendezvous([{ ...good, discovery_pubkey: undefined }])).toBeUndefined()
    expect(lnSendRendezvous([{ ...good, relays: [] }])).toBeUndefined()
  })

  it('returns undefined when nothing serves the corridor', () => {
    expect(lnSendRendezvous([])).toBeUndefined()
  })

  it('picks the first market that serves the corridor with a rendezvous', () => {
    const rendezvous = lnSendRendezvous([{ ...good, quote_corridor: 'onchain' }, good])
    expect(rendezvous?.solverPubkey).toBe(good.discovery_pubkey)
  })
})
