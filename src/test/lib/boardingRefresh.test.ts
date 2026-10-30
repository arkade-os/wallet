import { describe, expect, it, vi } from 'vitest'
import { retryBoardingFetch, type BoardingReader } from '../../lib/boardingRefresh'

const immediate = vi.fn(async () => {})

describe('retryBoardingFetch', () => {
  it('does nothing for a wallet that cannot read boarding', async () => {
    const wait = vi.fn(async () => {})
    await retryBoardingFetch({}, new AbortController().signal, vi.fn(), wait)
    expect(wait).not.toHaveBeenCalled()
  })

  it('does not refetch once boarding has loaded', async () => {
    const getBoardingUtxos = vi.fn()
    const wallet: BoardingReader = {
      getBalance: async () => ({ boarding: { loaded: true } }),
      getBoardingUtxos,
    }
    await retryBoardingFetch(wallet, new AbortController().signal, vi.fn(), immediate)
    expect(getBoardingUtxos).not.toHaveBeenCalled()
  })

  it('refetches and notifies when the background pass left boarding unloaded', async () => {
    const getBoardingUtxos = vi.fn(async () => [])
    const onFetched = vi.fn()
    const wallet: BoardingReader = {
      getBalance: async () => ({ boarding: { loaded: false } }),
      getBoardingUtxos,
    }
    await retryBoardingFetch(wallet, new AbortController().signal, onFetched, immediate)
    expect(getBoardingUtxos).toHaveBeenCalledOnce()
    expect(onFetched).toHaveBeenCalledOnce()
  })

  it('retries a timed-out electrum read', async () => {
    const getBoardingUtxos = vi
      .fn()
      .mockRejectedValueOnce(new Error('ElectrumWS request timeout. request ID: 1 (blockchain.scripthash.listunspent)'))
      .mockResolvedValueOnce([])
    const wallet: BoardingReader = {
      getBalance: async () => ({ boarding: { loaded: false } }),
      getBoardingUtxos,
    }
    await retryBoardingFetch(wallet, new AbortController().signal, vi.fn(), immediate)
    expect(getBoardingUtxos).toHaveBeenCalledTimes(2)
  })

  it('stops when the session is aborted during the wait', async () => {
    const controller = new AbortController()
    const getBalance = vi.fn()
    const wait = vi.fn(async () => {
      controller.abort()
    })
    await retryBoardingFetch({ getBalance, getBoardingUtxos: vi.fn() }, controller.signal, vi.fn(), wait)
    expect(getBalance).not.toHaveBeenCalled()
  })
})
