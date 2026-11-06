import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue } from '../mocks'
import { readSolverCards } from '../../../lib/solverCards'
import { prettyLongText } from '../../../lib/format'

const { mockFetchTransportCards } = vi.hoisted(() => ({ mockFetchTransportCards: vi.fn() }))

vi.mock('@arkade-os/swap/nostr', () => ({
  nostrCardFetcher: () => ({ fetch: mockFetchTransportCards }),
}))

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
      <BackupContext.Provider value={backupContextValue as any}>
        <Solvers />
      </BackupContext.Provider>
    </AspContext.Provider>,
  )
}

describe('Solvers screen', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFetchTransportCards.mockReset()
    mockFetchTransportCards.mockResolvedValue([])
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
    expect(readSolverCards()).toHaveLength(1)
    expect(screen.getByText('You have 1 solver card stored in your wallet.')).toBeInTheDocument()
  })

  it('labels a pointer card instead of listing no pairs', () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pointer', card: { version: 0, name: 'Pointer' } }]),
    )
    renderSolvers()

    expect(screen.getByText('Markets published by the solver')).toBeInTheDocument()
  })

  it('derives a canonical card’s pair label from its asset ids', () => {
    renderSolvers('bitcoin')

    // the bundled card names its legs only by CAIP-19 id and carries no `pair`
    expect(screen.getByText('BTC/lightning:BTC')).toBeInTheDocument()
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

    await waitFor(() => expect(readSolverCards()).toHaveLength(0))
    await waitFor(() => expect(screen.queryByText('My Card')).not.toBeInTheDocument())
  })

  it('shows card info when Info is clicked', async () => {
    const pubkey = 'b'.repeat(64)
    localStorage.setItem(
      'solverCards',
      JSON.stringify([
        {
          network: 'regtest',
          label: 'Pinned',
          card: {
            version: 0,
            name: 'Pinned',
            discovery_pubkey: pubkey,
            transports: { nostr: { relays: ['wss://example.com'] } },
            markets: [],
          },
        },
      ]),
    )
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: 'Info' }))

    await waitFor(() => expect(screen.getByText('Solver card info')).toBeInTheDocument())
    expect(screen.getByText(prettyLongText(pubkey))).toBeInTheDocument()
  })

  it('shows original and current values in the detail view', async () => {
    const pubkey = 'c'.repeat(64)
    const market = {
      pair: 'BTC/BTC',
      base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      fee_bps: 30,
      min_base_amount: '500',
      max_base_amount: '50000',
      min_quote_amount: '500',
      max_quote_amount: '50000',
    }
    const transports = { nostr: { relays: ['wss://example.com'] } }
    localStorage.setItem(
      'solverCards',
      JSON.stringify([
        {
          network: 'regtest',
          label: 'Pinned',
          card: { version: 0, name: 'Pinned', discovery_pubkey: pubkey, transports, markets: [market] },
        },
      ]),
    )
    mockFetchTransportCards.mockResolvedValue([
      {
        pubkey,
        createdAt: 1700000000,
        card: {
          version: 0,
          name: 'Pinned',
          discovery_pubkey: pubkey,
          transports,
          markets: [{ ...market, max_base_amount: '99999' }],
        },
      },
    ])
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: 'Info' }))

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Original' })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Current' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Current' }))
    await waitFor(() => expect(screen.getByText(/99999/)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Original' }))
    await waitFor(() => expect(screen.queryByText(/99999/)).not.toBeInTheDocument())
  })

  it('shows only the pinned card when no current card is available', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pinned', card: { version: 0, name: 'Pinned', markets: [] } }]),
    )
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: 'Info' }))

    await waitFor(() => expect(screen.getByText('Solver card info')).toBeInTheDocument())
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText(/no Nostr relays/)).toBeInTheDocument()
  })

  it('shows the raw card JSON in the detail view', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pinned', card: { version: 0, name: 'Pinned', markets: [] } }]),
    )
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: 'Info' }))

    await waitFor(() => expect(screen.getByText('Solver card info')).toBeInTheDocument())
    fireEvent.click(screen.getByText('View raw JSON'))
    await waitFor(() => expect(screen.getByText(/"name": "Pinned"/)).toBeInTheDocument())
  })
})
