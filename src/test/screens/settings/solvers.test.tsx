import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue } from '../mocks'
import { readSolverCardsFromStorage } from '../../../lib/storage'

vi.mock('@arkade-os/solver-discovery', async () => {
  const actual = await vi.importActual<typeof import('@arkade-os/solver-discovery')>('@arkade-os/solver-discovery')
  return {
    ...actual,
    validateCard: () => ({ ok: true, errors: [] }),
  }
})

function renderSolvers(network: string = 'regtest') {
  const backupContextValue = {
    backupAndUpdateConfig: vi.fn(),
    backupConfig: vi.fn().mockResolvedValue(undefined),
    backupChainSwap: vi.fn().mockResolvedValue(undefined),
    backupSolverCards: vi.fn().mockResolvedValue(undefined),
    backupReverseSwap: vi.fn().mockResolvedValue(undefined),
    backupSubmarineSwap: vi.fn().mockResolvedValue(undefined),
    fullBackup: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
  }

  return render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } } as any}
    >
      <AssetSwapsContext.Provider value={{ runDiscovery: vi.fn() } as any}>
        <BackupContext.Provider value={backupContextValue as any}>
          <Solvers />
        </BackupContext.Provider>
      </AssetSwapsContext.Provider>
    </AspContext.Provider>,
  )
}

describe('Solvers screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows an empty state when no solver cards are stored', () => {
    renderSolvers()

    expect(screen.getByText('Solvers')).toBeInTheDocument()
    expect(screen.getByText('You have no solver cards stored in your wallet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add new' })).toBeInTheDocument()
  })

  it('shows the bundled mainnet card as read-only, so the pinned solver is visible', () => {
    renderSolvers('bitcoin')

    // the build ships the beta solver's card; without this row the screen
    // claims "no solver cards" while a pinned solver is quoting sends
    expect(screen.getByText('beta-solver')).toBeInTheDocument()
    expect(screen.getByText('Built-in')).toBeInTheDocument()
    expect(screen.getByText('This build ships 1 solver card; add your own to reach more solvers.')).toBeInTheDocument()
    // read-only: not removable, not editable — only the add button renders
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('adds a solver card and renders it in the list', async () => {
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: '+ Add new' }))
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify({ version: 0, name: 'My Card', markets: [] }) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('My Card')).toBeInTheDocument())
    expect(readSolverCardsFromStorage()).toHaveLength(1)
    expect(screen.getByText('You have 1 solver card stored in your wallet.')).toBeInTheDocument()
  })

  it('removes a stored solver card', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'My Card', card: { name: 'My Card', markets: [] } }]),
    )
    renderSolvers()

    expect(screen.getByText('My Card')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    await waitFor(() => expect(readSolverCardsFromStorage()).toHaveLength(0))
    await waitFor(() => expect(screen.queryByText('My Card')).not.toBeInTheDocument())
  })
})
