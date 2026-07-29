import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { getPinnedSolverCards } from '../../../lib/swap/solverCards'
import { mockAspContextValue } from '../mocks'
import { solverCard } from '../../lib/swap/fixtures'

const refreshMarkets = vi.fn()

const renderSolvers = (network = 'mutinynet') =>
  render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } } as any}
    >
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
    </AspContext.Provider>,
  )

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
})
