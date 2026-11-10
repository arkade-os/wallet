import { beforeEach, describe, expect, it, vi } from 'vitest'
import { btcOn, createSwapClient, type Swap, type SwapClientConfig } from '@arkade-os/swap'
import { solverId } from '@arkade-os/solver-discovery'
import { makeSwapClient } from '../../lib/swapClient'
import { saveSolverRouting } from '../../lib/solverRouting'

const mocks = vi.hoisted(() => ({ history: vi.fn<() => Promise<Swap[]>>() }))
vi.mock('@arkade-os/swap', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap')>()),
  createSwapClient: vi.fn(() => ({ swaps: mocks.history })),
}))
vi.mock('../../lib/electrum', () => ({ electrumProvider: () => ({}) }))
vi.mock('../../lib/swapMarkets', () => ({ discoveryOptions: () => ({ network: 'regtest' }) }))
vi.mock('@arkade-os/swap/protocol', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/swap/protocol')>()),
  chainSourceFrom: () => ({}),
}))

const give = btcOn('arkade', 'regtest')
const take = btcOn('bolt11', 'regtest')
const direction = JSON.stringify(['regtest', give, take])
const priority = ['preferred', 'fallback']
const completed: Swap = {
  id: 'rfq:completed',
  family: 'rfq',
  outcome: 'paid',
  route: {
    give: { corridor: 'arkade', asset: give, instrument: { kind: 'wallet' } },
    take: { corridor: 'lightning', asset: take, instrument: { kind: 'wallet' } },
  },
  give: { asset: give, amount: BigInt(1001) },
  take: { asset: take, amount: BigInt(1000) },
  fee: { asset: give, amount: BigInt(1) },
  market: {
    kind: 'card',
    key: 'market',
    backend: 'rfq',
    source: 'registry',
    sourceType: 'registry',
    solver: 'solver',
    pair: 'BTC/lightning:BTC',
    snapshot: { fetchedAt: 1, live: true, source: 'injected' },
  },
  createdAt: 1,
  updatedAt: 1,
  expiresAt: 2,
}

const preferencesCallback = () => {
  makeSwapClient({} as SwapClientConfig['wallet'], 'regtest')
  const preferences = vi.mocked(createSwapClient).mock.calls.at(-1)?.[0].policy?.solverRouting?.preferences
  if (!preferences) throw new Error('missing solver routing preferences callback')
  return () => preferences({ network: 'regtest', direction, candidates: [] })
}

describe('wallet solver routing policy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(createSwapClient).mockClear()
    mocks.history.mockReset().mockResolvedValue([])
  })

  it.each(['manual', 'cost'] as const)('does not load history for %s ordering', async (mode) => {
    saveSolverRouting('regtest', direction, { mode, priority })
    mocks.history.mockRejectedValue(new Error('history unavailable'))
    await expect(preferencesCallback()()).resolves.toEqual({ mode, priority })
    expect(mocks.history).not.toHaveBeenCalled()
  })

  it('adds completed usage only when the current saved mode requests it', async () => {
    const preferences = preferencesCallback()
    saveSolverRouting('regtest', direction, { mode: 'usage', priority })
    mocks.history.mockResolvedValue([completed, completed, { ...completed, id: 'rfq:pending', outcome: 'funded' }])
    await expect(preferences()).resolves.toEqual({
      mode: 'usage',
      priority,
      usage: { [solverId({ solver: 'solver', source: 'registry', sourceType: 'registry' }, 'regtest')]: 1 },
    })
    expect(mocks.history).toHaveBeenCalledOnce()
  })

  it('keeps saved priority without usage counts when advisory history fails', async () => {
    saveSolverRouting('regtest', direction, { mode: 'usage', priority })
    mocks.history.mockRejectedValue(new Error('history unavailable'))
    await expect(preferencesCallback()()).resolves.toEqual({ mode: 'usage', priority })
    expect(mocks.history).toHaveBeenCalledOnce()
  })

  it('keeps saved priority even if a constructor calls preferences before returning the client', async () => {
    saveSolverRouting('regtest', direction, { mode: 'usage', priority })
    const construct = vi.mocked(createSwapClient).getMockImplementation()
    if (!construct) throw new Error('missing client constructor mock')
    let eager: unknown
    vi.mocked(createSwapClient).mockImplementationOnce((config) => {
      eager = config.policy?.solverRouting?.preferences?.({ network: 'regtest', direction, candidates: [] })
      return construct(config)
    })
    makeSwapClient({} as SwapClientConfig['wallet'], 'regtest')
    await expect(eager).resolves.toEqual({ mode: 'usage', priority })
    expect(mocks.history).not.toHaveBeenCalled()
  })
})
