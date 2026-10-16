import { describe, expect, it } from 'vitest'
import { chainLabel } from '../../../lib/receive/chainLabels'

// lnurl-server's FF_ASSETS and SIM_ASSETS chains (src/rails/fixedfloat/{catalogue,simulate}.ts at ec6573e).
const SERVER_CHAINS = [
  'eip155:1',
  'eip155:42161',
  'eip155:8453',
  'eip155:10',
  'eip155:137',
  'eip155:43114',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  'tron:0x2b6653dc',
  'eip155:421614',
  'eip155:84532',
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  'tron:0xcd8690dc',
]

describe('chainLabel', () => {
  it('every FF_ASSETS chain has a label', () => {
    for (const chain of SERVER_CHAINS) expect(chainLabel(chain), chain).not.toBe(chain)
    expect(chainLabel('eip155:42161')).toBe('Arbitrum One')
  })

  it('an unknown chain falls back to its CAIP-2 string', () => {
    expect(chainLabel('eip155:999999')).toBe('eip155:999999')
  })
})
