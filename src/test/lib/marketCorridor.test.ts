// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hex } from '@scure/base'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { isRfqMarket, marketCorridor, marketPairLabel } from '@arkade-os/swap'
import { lnReceiveRendezvous, lnSendRendezvous } from '../../lib/lnSwap'
import corridorSolverCard from '../corridor-solver.card.json'

// A market written by hand would pass fixed or not, since #23 removes fields
// rather than changing types — so the new-shape cases use the registry's own
// `corridor-solver` fixture, copied verbatim from the #23 branch.

const EMULATOR = new Uint8Array(32).fill(0xcc)

/** The card's markets as discovery hands them over: card rendezvous propagated onto each. */
const discovered = (card: typeof corridorSolverCard): DiscoveredMarket[] =>
  card.markets.map(
    (market) =>
      ({
        ...market,
        discovery_pubkey: card.discovery_pubkey,
        transports: card.transports,
      }) as unknown as DiscoveredMarket,
  )

const newFormat = () => discovered(corridorSolverCard)

const oldFormat = (): DiscoveredMarket[] =>
  newFormat().map(
    (market) =>
      ({
        ...market,
        pair: 'BTC/lightning:BTC',
        base_asset: { ...(market.base_asset as object), id: 'btc' },
        quote_asset: { ...(market.quote_asset as object), id: 'btc' },
        quote_corridor: 'lightning',
      }) as unknown as DiscoveredMarket,
  )

describe('corridor derivation across the #23 schema change', () => {
  it('reads the corridor off a new-format asset id', () => {
    const [market] = newFormat()
    expect(marketCorridor(market, 'base')).toBe('arkade')
    expect(marketCorridor(market, 'quote')).toBe('bolt11')
  })

  it('still reads the corridor off a pre-#23 card, which is what the live index serves today', () => {
    const [market] = oldFormat()
    expect(marketCorridor(market, 'base')).toBe('arkade')
    expect(marketCorridor(market, 'quote')).toBe('bolt11')
  })

  it('defaults a spot market to the arkade rail in both shapes', () => {
    const spot = {
      base_asset: { id: 'arkade:bitcoin/slip44:0' },
      quote_asset: { id: 'arkade:bitcoin/asset:' + 'a'.repeat(68) },
    }
    expect(isRfqMarket(spot)).toBe(false)
    expect(isRfqMarket({ base_asset: { id: 'btc' }, quote_asset: { id: 'f'.repeat(68) } })).toBe(false)
  })

  it('treats an unrecognised namespace as arkade rather than inventing a rail', () => {
    expect(marketCorridor({ quote_asset: { id: 'ripple:mainnet/slip44:144' } }, 'quote')).toBe('arkade')
  })

  it('prefers the asset id over the deprecated compat field the published index still carries', () => {
    // The index keeps `quote_corridor` as a compat field in the v0 spelling
    // (`lightning`, not `bolt11`); the id is canonical, so it wins either way.
    const agreeing = { quote_asset: { id: 'bolt11:bitcoin/slip44:0' }, quote_corridor: 'lightning' }
    expect(marketCorridor(agreeing, 'quote')).toBe('bolt11')
    const disagreeing = { quote_asset: { id: 'bolt11:bitcoin/slip44:0' }, quote_corridor: 'onchain' }
    expect(marketCorridor(disagreeing, 'quote')).toBe('bolt11')
  })

  it('labels a corridor market for display now that `pair` is gone', () => {
    expect(marketPairLabel(newFormat()[0])).toBe('BTC/bolt11:BTC')
  })
})

describe('lightning send survives the #23 schema change', () => {
  it('finds a rendezvous on a new-format card', () => {
    const rendezvous = lnSendRendezvous(newFormat(), EMULATOR)
    expect(rendezvous).toBeDefined()
    expect(rendezvous?.solverPubkey).toBe(corridorSolverCard.discovery_pubkey)
    expect(rendezvous?.emulatorPubkey).toBe(hex.encode(EMULATOR))
    expect(rendezvous?.minSats).toBe(Number(corridorSolverCard.markets[0].min_quote_amount))
    expect(rendezvous?.maxSats).toBe(Number(corridorSolverCard.markets[0].max_quote_amount))
  })

  it('still finds a rendezvous on a pre-#23 card', () => {
    expect(lnSendRendezvous(oldFormat(), EMULATOR)).toBeDefined()
  })

  it('finds the receive leg on a new-format card, reading the base side bounds', () => {
    const rendezvous = lnReceiveRendezvous(newFormat(), EMULATOR)
    expect(rendezvous?.minSats).toBe(Number(corridorSolverCard.markets[0].min_base_amount))
  })

  it('skips a market on another rail instead of quoting it as Lightning', () => {
    const onchain = newFormat().map(
      (market) =>
        ({
          ...market,
          quote_asset: { ...(market.quote_asset as object), id: 'bitcoin:bitcoin/slip44:0' },
        }) as DiscoveredMarket,
    )
    expect(lnSendRendezvous(onchain, EMULATOR)).toBeUndefined()
  })
})

describe('the spot swap surface excludes corridor markets', () => {
  it('excludes a new-format corridor market', () => {
    expect(newFormat().filter((m) => !isRfqMarket(m))).toEqual([])
  })

  it('excludes a pre-#23 corridor market', () => {
    expect(oldFormat().filter((m) => !isRfqMarket(m))).toEqual([])
  })

  it('excludes a market whose non-arkade side is the base leg, which the dropped-field check missed', () => {
    const baseSideCorridor = {
      base_asset: { id: 'bolt11:bitcoin/slip44:0' },
      quote_asset: { id: 'arkade:bitcoin/slip44:0' },
    }
    expect(isRfqMarket(baseSideCorridor)).toBe(true)
  })
})

const ERC20_ID = 'eip155:1/erc20:0x' + 'a'.repeat(40)

describe('the index deprecation window, where an entry carries both shapes', () => {
  // solver-registry bc07a02 keeps `pair` and the corridor fields on index
  // entries for one release, derived from the ids as bolt11->lightning,
  // bitcoin->onchain, eip155->eip155.
  const indexEntry = (overrides: Record<string, unknown> = {}) =>
    ({
      ...newFormat()[0],
      pair: 'BTC/lightning:BTC',
      base_corridor: 'arkade',
      quote_corridor: 'lightning',
      ...overrides,
    }) as unknown as DiscoveredMarket

  it('resolves each namespace off the id', () => {
    expect(marketCorridor({ quote_asset: { id: 'arkade:bitcoin/slip44:0' } }, 'quote')).toBe('arkade')
    expect(marketCorridor({ quote_asset: { id: 'bolt11:bitcoin/slip44:0' } }, 'quote')).toBe('bolt11')
    expect(marketCorridor({ quote_asset: { id: ERC20_ID } }, 'quote')).toBe('eip155')
  })

  it('never answers with a v0 rail name, which no call site tests for', () => {
    for (const market of [indexEntry(), oldFormat()[0], indexEntry({ quote_corridor: 'onchain' })]) {
      expect(['arkade', 'bolt11', 'bitcoin', 'eip155']).toContain(marketCorridor(market, 'quote'))
    }
  })

  it('still finds the Lightning rendezvous on a compat index entry', () => {
    expect(lnSendRendezvous([indexEntry()], EMULATOR)).toBeDefined()
  })

  it('keeps an EVM market off the Lightning corridor and off the spot surface', () => {
    const evm = indexEntry({ quote_asset: { id: ERC20_ID, ticker: 'USDC' }, quote_corridor: 'eip155' })
    expect(marketCorridor(evm, 'quote')).not.toBe('arkade')
    expect(lnSendRendezvous([evm], EMULATOR)).toBeUndefined()
    expect(isRfqMarket(evm)).toBe(true)
  })
})
