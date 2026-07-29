import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { getUserRegistries } from '../../../lib/swap/markets'
import { getPinnedSolverCards, pinSolverCard } from '../../../lib/swap/solverCards'
import { mockAspContextValue } from '../mocks'
import { solverCard } from '../../lib/swap/fixtures'

const refreshMarkets = vi.fn()

const solversAt = (network: string) => (
  <AspContext.Provider value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } } as any}>
    <AssetSwapsContext.Provider
      value={{
        markets: [],
        refreshMarkets,
        swapAvailable: false,
        swaps: [],
        createSwap: vi.fn(),
        cancelSwap: vi.fn(),
      }}
    >
      <Solvers />
    </AssetSwapsContext.Provider>
  </AspContext.Provider>
)

const renderSolvers = (network = 'mutinynet') => render(solversAt(network))

const typeCard = (value: string) => fireEvent.change(screen.getByLabelText('Solver card JSON'), { target: { value } })
const addButton = () => screen.getByRole('button', { name: /add solver/i })

describe('Solvers settings screen', () => {
  beforeEach(() => {
    localStorage.clear()
    refreshMarkets.mockClear()
  })

  it('pins a pasted card, refreshes markets and lists the solver', () => {
    renderSolvers()
    typeCard(JSON.stringify(solverCard()))
    fireEvent.click(addButton())
    expect(screen.getByTestId('pinned-solver-privateer')).toBeTruthy()
    expect(screen.getByText(/1 market: BTC\/USDT/)).toBeTruthy()
    expect(getPinnedSolverCards('mutinynet')).toHaveLength(1)
    expect(refreshMarkets).toHaveBeenCalledTimes(1)
  })

  it('rejects broken JSON with an error and stores nothing', () => {
    renderSolvers()
    typeCard('{not json')
    fireEvent.click(addButton())
    expect(screen.getByTestId('error-message').textContent).toMatch(/not valid json/i)
    expect(getPinnedSolverCards('mutinynet')).toHaveLength(0)
    expect(refreshMarkets).not.toHaveBeenCalled()
  })

  it('surfaces schema errors from the card validator', () => {
    renderSolvers()
    typeCard(JSON.stringify({ ...solverCard(), version: 1 }))
    fireEvent.click(addButton())
    expect(screen.getByTestId('error-message').textContent).toContain('/version must be 0')
    expect(getPinnedSolverCards('mutinynet')).toHaveLength(0)
  })

  it('removes a pinned solver and refreshes markets', () => {
    renderSolvers()
    typeCard(JSON.stringify(solverCard()))
    fireEvent.click(addButton())
    fireEvent.click(screen.getByRole('button', { name: 'Remove solver privateer' }))
    expect(screen.queryByTestId('pinned-solver-privateer')).toBeNull()
    expect(getPinnedSolverCards('mutinynet')).toHaveLength(0)
    expect(refreshMarkets).toHaveBeenCalledTimes(2)
  })

  it('disables the add button while the input is empty', () => {
    renderSolvers()
    expect((addButton() as HTMLButtonElement).disabled).toBe(true)
  })

  it('loads the pinned list once the network resolves after mount', () => {
    pinSolverCard('mutinynet', solverCard())
    const { rerender } = render(solversAt(''))
    expect(screen.getByText(/connect to a server first/i)).toBeTruthy()
    expect(screen.queryByTestId('pinned-solver-privateer')).toBeNull()
    rerender(solversAt('mutinynet'))
    expect(screen.getByTestId('pinned-solver-privateer')).toBeTruthy()
  })

  it('blocks networks solver discovery does not support instead of taking dead pins', () => {
    renderSolvers('testnet')
    expect(screen.getByText('Solver cards are not supported on this network.')).toBeTruthy()
    expect(screen.queryByLabelText('Solver card JSON')).toBeNull()
  })

  it('shows the raw card.json behind a details toggle', () => {
    pinSolverCard('mutinynet', solverCard())
    renderSolvers()
    expect(screen.getByText('View card.json')).toBeTruthy()
    expect(screen.getByText(/"name": "privateer"/)).toBeTruthy()
  })

  it('follows and unfollows a registry, refreshing markets both times', () => {
    renderSolvers()
    fireEvent.change(screen.getByTestId('registry-url'), { target: { value: 'https://r.example.com/m.json' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add registry' }))
    expect(getUserRegistries('mutinynet')).toEqual(['https://r.example.com/m.json'])
    expect(screen.getByText('https://r.example.com/m.json')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove registry https://r.example.com/m.json' }))
    expect(getUserRegistries('mutinynet')).toEqual([])
    expect(refreshMarkets).toHaveBeenCalledTimes(2)
  })

  it('rejects an invalid registry URL inline, storing nothing', () => {
    renderSolvers()
    fireEvent.change(screen.getByTestId('registry-url'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add registry' }))
    expect(screen.getByText(/not a valid registry/i)).toBeTruthy()
    expect(getUserRegistries('mutinynet')).toEqual([])
    expect(refreshMarkets).not.toHaveBeenCalled()
  })

  it('reset removes every pinned solver and drops the markets cache', () => {
    pinSolverCard('mutinynet', solverCard())
    localStorage.setItem('swapMarkets-mutinynet-r', '{}')
    renderSolvers()
    fireEvent.click(screen.getByRole('button', { name: /reset from registry/i }))
    expect(screen.queryByTestId('pinned-solver-privateer')).toBeNull()
    expect(getPinnedSolverCards('mutinynet')).toEqual([])
    expect(localStorage.getItem('swapMarkets-mutinynet-r')).toBeNull()
    expect(refreshMarkets).toHaveBeenCalledTimes(1)
  })
})
