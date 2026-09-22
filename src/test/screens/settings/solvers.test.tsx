import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue } from '../mocks'
import { readSolverCards } from '../../../lib/solverCards'

// Same shape as src/test/lib/solverCards.test.ts's "legacy" fixture: a
// corridor market real enough to clear validateCard's strict checks.
const bounds = {
  fee_bps: 30,
  fee_flat: '50',
  min_base_amount: '330',
  max_base_amount: '5000000',
  min_quote_amount: '330',
  max_quote_amount: '1000000',
}

const asset = (id: string) => ({ id, name: 'Bitcoin', ticker: 'BTC', decimals: 8 })

const validCard = (name: string) => ({
  version: 0,
  name,
  discovery_pubkey: '3f831510a6d7678d0c90d7d6fbc4057720517e2e30681ef4c87cc57aaf57e8d5',
  transports: { nostr: { relays: ['wss://nostr.arkade.sh'] } },
  markets: [
    {
      pair: 'BTC/lightning:BTC',
      base_asset: asset('btc'),
      quote_asset: asset('btc'),
      base_corridor: 'arkade',
      quote_corridor: 'lightning',
      ...bounds,
    },
  ],
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
    // the label is derived from the sides now that #23 drops the card's `pair`
    expect(screen.getByText('BTC/bolt11:BTC')).toBeInTheDocument()
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
      target: { value: JSON.stringify(validCard('added-card')) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('added-card')).toBeInTheDocument())
    expect(readSolverCards()).toHaveLength(1)
    expect(screen.getByText('You have 1 solver card stored in your wallet.')).toBeInTheDocument()
  })

  it('removes a stored solver card', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'stored-card', card: validCard('stored-card') }]),
    )
    renderSolvers()

    expect(screen.getByText('stored-card')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])

    await waitFor(() => expect(readSolverCards()).toHaveLength(0))
    await waitFor(() => expect(screen.queryByText('stored-card')).not.toBeInTheDocument())
  })

  it('rejects an invalid card and surfaces the real validator error', async () => {
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: '+ Add new' }))
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify({ version: 0, name: 'My Card', markets: [] }) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(
        screen.getByText('invalid card: /name must match "^[a-z0-9-]+$"; /markets must be a non-empty array'),
      ).toBeInTheDocument(),
    )
    expect(readSolverCards()).toHaveLength(0)
  })
})
