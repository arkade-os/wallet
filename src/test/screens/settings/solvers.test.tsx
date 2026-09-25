import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue } from '../mocks'

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
      <BackupContext.Provider value={backupContextValue as any}>
        <Solvers />
      </BackupContext.Provider>
    </AspContext.Provider>,
  )
}

describe('Solvers screen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the bundled mainnet card as read-only, so the pinned solver is visible', () => {
    renderSolvers('bitcoin')

    // the build ships the beta solver's card; without this row the screen
    // claims "no solver cards" while a pinned solver is quoting sends
    expect(screen.getByText('beta-solver')).toBeInTheDocument()
    // the label is derived from the sides now that #23 drops the card's `pair`
    expect(screen.getByText('BTC/bolt11:BTC')).toBeInTheDocument()
    expect(screen.getByText('Built-in')).toBeInTheDocument()
    expect(screen.getByText('This build ships 1 solver card; add your own to reach more solvers.')).toBeInTheDocument()
    // read-only: not removable, not editable — only the add button renders
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
