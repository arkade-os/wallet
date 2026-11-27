import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  getExecutorParams,
  getExecutorUrlForNetwork,
  getSolverRegistryUrl,
  isExecutorEnabled,
  isMainnet,
} from '../../lib/constants'

describe('isMainnet', () => {
  it('returns true for bitcoin and unrecognized networks', () => {
    expect(isMainnet('bitcoin')).toBe(true)
    expect(isMainnet('some-future-network')).toBe(true)
  })

  it('returns false for known test networks', () => {
    expect(isMainnet('testnet')).toBe(false)
    expect(isMainnet('mutinynet')).toBe(false)
    expect(isMainnet('signet')).toBe(false)
    expect(isMainnet('regtest')).toBe(false)
  })

  it('returns false for an empty network (unreachable operator or not yet loaded)', () => {
    expect(isMainnet('')).toBe(false)
  })
})

describe('getSolverRegistryUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('takes the library published index for a discovery network', () => {
    expect(getSolverRegistryUrl('bitcoin')).toBe('https://arkade-os.github.io/solver-registry/bitcoin.json')
    expect(getSolverRegistryUrl('mutinynet')).toBe('https://arkade-os.github.io/solver-registry/mutinynet.json')
    // signet publishes an index that is served even though it lists no markets
    expect(getSolverRegistryUrl('signet')).toBe('https://arkade-os.github.io/solver-registry/signet.json')
  })

  it('keeps regtest on the local harness index, not the published one', () => {
    expect(getSolverRegistryUrl('regtest')).toBe('http://localhost:3002/solver-registry/regtest.json')
  })

  it('lets an explicit VITE_SOLVER_REGISTRY_URL name a URL for any network', () => {
    vi.stubEnv('VITE_SOLVER_REGISTRY_URL', 'https://example.test/registry.json')
    expect(getSolverRegistryUrl('bitcoin')).toBe('https://example.test/registry.json')
    expect(getSolverRegistryUrl('regtest')).toBe('https://example.test/registry.json')
  })

  it('reads an unsubstituted runtime placeholder as no override, not a URL', () => {
    vi.stubEnv('VITE_SOLVER_REGISTRY_URL', '__VITE_SOLVER_REGISTRY_URL__')
    expect(getSolverRegistryUrl('bitcoin')).toBe('https://arkade-os.github.io/solver-registry/bitcoin.json')
  })
})

describe('isExecutorEnabled', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('is off only when the build sets false', () => {
    vi.stubEnv('VITE_EXECUTOR_ENABLED', 'false')
    expect(isExecutorEnabled()).toBe(false)
  })

  it.each(['', 'true', '__VITE_EXECUTOR_ENABLED__'])('is on for %j', (value) => {
    vi.stubEnv('VITE_EXECUTOR_ENABLED', value)
    expect(isExecutorEnabled()).toBe(true)
  })
})

describe('getExecutorUrlForNetwork', () => {
  it('returns the mainnet Executor for bitcoin', () => {
    expect(getExecutorUrlForNetwork('bitcoin')).toBe('https://executor.arkade.sh')
  })
})

describe('getExecutorParams', () => {
  it('keeps the window shorter than the VTXO expiry, which regtest sets to a day', () => {
    expect(getExecutorParams('regtest').renewalWindow).toBeLessThan(86_400)
  })

  it('renews half an hour before expiry elsewhere', () => {
    expect(getExecutorParams('mutinynet')).toEqual({ renewalWindow: 1_800, maxFee: 1_000 })
    expect(getExecutorParams('bitcoin')).toEqual({ renewalWindow: 1_800, maxFee: 1_000 })
  })

  describe('with VITE_EXECUTOR_RENEWAL_WINDOW', () => {
    afterEach(() => vi.unstubAllEnvs())

    it('takes the window on regtest', () => {
      vi.stubEnv('VITE_EXECUTOR_RENEWAL_WINDOW', '85800')
      expect(getExecutorParams('regtest')).toEqual({ renewalWindow: 85_800, maxFee: 1_000 })
    })

    it('never changes another network', () => {
      vi.stubEnv('VITE_EXECUTOR_RENEWAL_WINDOW', '85800')
      expect(getExecutorParams('mutinynet').renewalWindow).toBe(1_800)
      expect(getExecutorParams('bitcoin').renewalWindow).toBe(1_800)
    })

    it.each(['', 'abc', '0', '-60', '1.5', '__VITE_EXECUTOR_RENEWAL_WINDOW__'])('ignores %j', (value) => {
      vi.stubEnv('VITE_EXECUTOR_RENEWAL_WINDOW', value)
      expect(getExecutorParams('regtest').renewalWindow).toBe(43_200)
    })
  })
})
