import { describe, expect, it } from 'vitest'
import { runMintId } from './actors'

describe('live mint cleanup identity', () => {
  it('waits for an indexer observation and accepts only the fresh 20-unit asset', () => {
    expect(runMintId({}, {})).toBeUndefined()
    expect(runMintId({}, { 'run-asset': '20' })).toBe('run-asset')
  })

  it('refuses old holdings, multiple new assets and unexpected supply', () => {
    for (const [before, after] of [
      [{ 'old-asset': '1' }, { 'old-asset': '1', 'run-asset': '20' }],
      [{}, { 'run-asset': '20', 'unknown-asset': '1' }],
      [{}, { 'run-asset': '19' }],
    ])
      expect(() => runMintId(before, after)).toThrow('Unexpected holdings for the live run mint')
  })
})
