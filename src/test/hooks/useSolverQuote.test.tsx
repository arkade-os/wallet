import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { planOffer, type OfferPlan } from '@arkade-os/solver-discovery'
import { useSolverQuote } from '../../hooks/useSolverQuote'
import { previewSolverQuote } from '../../lib/solverQuote'
import { btcUsdt } from '../lib/swapFixtures'

vi.mock('../../lib/solverQuote', () => ({ previewSolverQuote: vi.fn() }))
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
