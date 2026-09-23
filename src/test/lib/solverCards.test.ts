import { beforeEach, describe, expect, it } from 'vitest'
import { readSolverCards } from '../../lib/solverCards'

const solver = {
  name: 'ln-solver-mutinynet',
  discovery_pubkey: '3f831510a6d7678d0c90d7d6fbc4057720517e2e30681ef4c87cc57aaf57e8d5',
  transports: { nostr: { relays: ['wss://nostr.arkade.sh'] } },
}

const bounds = {
  fee_bps: 30,
  fee_flat: '50',
  min_base_amount: '330',
  max_base_amount: '5000000',
  min_quote_amount: '330',
  max_quote_amount: '1000000',
}

const asset = (id: string) => ({ id, name: 'Bitcoin', ticker: 'BTC', decimals: 8 })

describe('stored solver card compatibility', () => {
  beforeEach(() => localStorage.clear())

  it('keeps both legacy corridor cards and CAIP-19 cards', () => {
    const legacy = {
      version: 0,
      ...solver,
      markets: [
        {
          pair: 'BTC/lightning:BTC',
          base_asset: asset('btc'),
          quote_asset: asset('btc'),
          base_corridor: 'arkade',
          quote_corridor: 'lightning',
          ...bounds,
        },
      ],
    }
    const caip19 = {
      version: 0,
      ...solver,
      markets: [
        {
          base_asset: asset('arkade:mutinynet/slip44:1'),
          quote_asset: asset('bolt11:mutinynet/slip44:1'),
          ...bounds,
        },
      ],
    }
    localStorage.setItem(
      'solverCards',
      JSON.stringify([
        { network: 'mutinynet', label: 'legacy', card: legacy },
        { network: 'mutinynet', label: 'caip19', card: caip19 },
      ]),
    )

    expect(readSolverCards().map(({ label }) => label)).toEqual(['legacy', 'caip19'])
  })
})
