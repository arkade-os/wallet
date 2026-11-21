import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { planOffer, solverDirectionKey, solverId, type OfferPlan } from '@arkade-os/solver-discovery'
import { useSolverQuote } from '../../hooks/useSolverQuote'
import { previewSolverQuote } from '../../lib/solverQuote'
import { saveSolverRouting } from '../../lib/solverRouting'
import { btcUsdt } from '../lib/swapFixtures'

vi.mock('../../lib/solverQuote', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/solverQuote')>()),
  previewSolverQuote: vi.fn(),
}))
beforeEach(() => {
  localStorage.clear()
  vi.mocked(previewSolverQuote).mockReset()
})

it('aborts the previous network preview and never exposes its late plan', async () => {
  const pending: { resolve: (plan: OfferPlan) => void; signal?: AbortSignal }[] = []
  vi.mocked(previewSolverQuote).mockImplementation(
    (_markets, _from, _to, _amount, _network, _fetch, signal) =>
      new Promise((resolve) => pending.push({ resolve, signal })),
  )
  const { result, rerender } = renderHook(
    ({ network, dust }) => useSolverQuote([btcUsdt], 'btc', btcUsdt.quote_asset.id, network, dust),
    {
      initialProps: { network: 'mutinynet', dust: BigInt(500) },
    },
  )
  act(() => result.current.setGiveAmount('0.0001'))
  await waitFor(() => expect(pending).toHaveLength(1))
  expect(vi.mocked(previewSolverQuote).mock.calls[0][7]).toBe(BigInt(500))
  rerender({ network: 'bitcoin', dust: BigInt(500) })
  await waitFor(() => expect(pending).toHaveLength(2))
  expect(pending[0].signal?.aborted).toBe(true)
  const previous = planOffer({ market: btcUsdt, give: 'base', giveAmount: '0.0001', feedValue: '100000', safetyBps: 0 })
  await act(async () => pending[0].resolve(previous))
  expect(result.current.plan).toBeNull()
  expect(result.current.status).toBe('loading')
  const current = { ...previous, market: { ...btcUsdt, source: 'current' } }
  await act(async () => pending[1].resolve(current))
  expect(result.current.plan).toBe(current)
})

it('refreshes on preference changes and discards both displayed and late plans', async () => {
  const pending: { resolve: (plan: OfferPlan) => void; signal?: AbortSignal }[] = []
  vi.mocked(previewSolverQuote).mockImplementation(
    (_markets, _from, _to, _amount, _network, _fetch, signal) =>
      new Promise((resolve) => pending.push({ resolve, signal })),
  )
  const { result } = renderHook(() => useSolverQuote([btcUsdt], 'btc', btcUsdt.quote_asset.id, 'mutinynet'))
  act(() => result.current.setGiveAmount('0.0001'))
  await waitFor(() => expect(pending).toHaveLength(1))
  const previous = planOffer({ market: btcUsdt, give: 'base', giveAmount: '0.0001', feedValue: '100000', safetyBps: 0 })
  await act(async () => pending[0].resolve(previous))
  expect(result.current.plan).toBe(previous)

  const direction = solverDirectionKey(btcUsdt, 'base', 'mutinynet')
  act(() => saveSolverRouting('mutinynet', direction, { mode: 'cost', preferFirst: solverId(btcUsdt, 'mutinynet') }))
  await waitFor(() => expect(pending).toHaveLength(2))
  expect(pending[0].signal?.aborted).toBe(true)
  expect(result.current.plan).toBeNull()
  expect(result.current.status).toBe('loading')

  act(() => saveSolverRouting('mutinynet', direction, { mode: 'cost' }))
  await waitFor(() => expect(pending).toHaveLength(3))
  expect(pending[1].signal?.aborted).toBe(true)
  await act(async () => pending[1].resolve(previous))
  expect(result.current.plan).toBeNull()
  expect(result.current.status).toBe('loading')
  const current = { ...previous, market: { ...btcUsdt, source: 'current' } }
  await act(async () => pending[2].resolve(current))
  expect(result.current.plan).toBe(current)
  expect(result.current.status).toBe('success')
})

it('retains the amount violation plan while marking confirmed saved-solver amount exclusion', async () => {
  const actual = await vi.importActual<typeof import('../../lib/solverQuote')>('../../lib/solverQuote')
  const market = { ...btcUsdt, max_base_amount: '1' }
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bitcoin: { usd: 100000 } }))) as typeof fetch
  vi.mocked(previewSolverQuote).mockImplementation(() =>
    actual.previewSolverQuote([market], 'btc', btcUsdt.quote_asset.id, '0.0001', 'mutinynet', fetchImpl),
  )
  const { result } = renderHook(() => useSolverQuote([market], 'btc', btcUsdt.quote_asset.id, 'mutinynet'))

  act(() => result.current.setGiveAmount('0.0001'))
  await waitFor(() => expect(result.current.status).toBe('success'))
  expect(result.current.plan?.market).toEqual(market)
  expect(result.current.plan?.deposit.atomic).toBe(10_000n)
  expect(result.current.solvable).toBe(false)
})

it('leaves capability unknown after a transient quote failure', async () => {
  vi.mocked(previewSolverQuote).mockRejectedValue(new Error('feed unavailable'))
  const { result } = renderHook(() => useSolverQuote([btcUsdt], 'btc', btcUsdt.quote_asset.id, 'mutinynet'))

  act(() => result.current.setGiveAmount('0.0001'))
  await waitFor(() => expect(result.current.status).toBe('error'))
  expect(result.current.plan).toBeNull()
  expect(result.current.solvable).toBeUndefined()
})
