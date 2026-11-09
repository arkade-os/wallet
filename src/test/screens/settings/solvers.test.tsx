import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue } from '../mocks'
import { readSolverCards } from '../../../lib/solverCards'
import { prettyLongText } from '../../../lib/format'
import { SwapsContext } from '../../../providers/swaps'
import { btcUsdt } from '../../lib/swapFixtures'
import { readSolverRouting } from '../../../lib/solverRouting'
import { solverDirectionKey, solverId, type DiscoveredMarket } from '@arkade-os/solver-discovery'

const ReactSwapsDefault = {
  allMarkets: [],
  markets: [],
  swaps: [],
  swapAvailable: false,
  runDiscovery: vi.fn(),
  exchange: vi.fn(),
  cancelSwap: vi.fn(),
  recoverSwap: vi.fn(),
  quotePay: vi.fn(),
  acceptPay: vi.fn(),
  receiveLightning: vi.fn(),
  sendRouter: vi.fn(),
  outcomeOf: vi.fn(),
  errorOf: vi.fn(),
}

const { mockFetchTransportCards, mockSolverUsage } = vi.hoisted(() => ({
  mockFetchTransportCards: vi.fn(),
  mockSolverUsage: vi.fn(),
}))

vi.mock('../../../lib/swapRecords', async () => ({
  ...(await vi.importActual<typeof import('../../../lib/swapRecords')>('../../../lib/swapRecords')),
  solverUsage: mockSolverUsage,
}))

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

function renderSolvers(network: string = 'regtest', allMarkets: DiscoveredMarket[] = []) {
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
        <SwapsContext.Provider value={{ ...ReactSwapsDefault, allMarkets }}>
          <Solvers />
        </SwapsContext.Provider>
      </BackupContext.Provider>
    </AspContext.Provider>,
  )
}

describe('Solvers screen', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSolverUsage.mockReset().mockResolvedValue({})
    mockFetchTransportCards.mockReset()
    mockFetchTransportCards.mockResolvedValue([])
  })

  it('groups independently identified same-name discovered and local solvers and persists direction priority', async () => {
    const first = { ...btcUsdt, solver: 'Same name', discovery_pubkey: 'a'.repeat(64) }
    const second = { ...first, discovery_pubkey: 'b'.repeat(64), sourceType: 'local' as const }
    renderSolvers('mutinynet', [first, second])
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getAllByText('Same name')).toHaveLength(4)
    expect(screen.getAllByText(`${prettyLongText(first.discovery_pubkey)} · registry`)).toHaveLength(2)
    expect(screen.getAllByText(`${prettyLongText(second.discovery_pubkey)} · local`)).toHaveLength(2)
    expect(screen.queryByText(`${prettyLongText(solverId(first, 'mutinynet'))} · registry`)).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down Same name' })[0])
    const direction = solverDirectionKey(first, 'base', 'mutinynet')
    expect(readSolverRouting('mutinynet', direction).priority).toEqual([
      solverId(second, 'mutinynet'),
      solverId(first, 'mutinynet'),
    ])
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'cost' } })
    expect(readSolverRouting('mutinynet', direction).mode).toBe('cost')
    expect(screen.getByText(/Costs are estimated at the trade amount/)).toBeInTheDocument()
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'usage' } })
    expect(readSolverRouting('mutinynet', direction).mode).toBe('usage')
  })

  it('shows an error when completed usage cannot be loaded', async () => {
    mockSolverUsage.mockRejectedValue(new Error('storage unavailable'))
    renderSolvers('mutinynet', [btcUsdt])
    expect(await screen.findAllByText('Unable to load completed swap usage.')).toHaveLength(2)
  })

  it('retains pasted cards with the same name and different discovery keys', async () => {
    renderSolvers()
    for (const key of ['a', 'b']) {
      fireEvent.click(screen.getByRole('button', { name: '+ Add new' }))
      fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
        target: {
          value: JSON.stringify({ version: 0, name: 'Same name', discovery_pubkey: key.repeat(64), markets: [] }),
        },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(readSolverCards()).toHaveLength(key === 'a' ? 1 : 2))
    }
    expect(screen.getAllByText('Same name')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(readSolverCards()).toHaveLength(1))
    expect((readSolverCards()[0].card as { discovery_pubkey: string }).discovery_pubkey).toBe('b'.repeat(64))
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

  it('replaces the original unsigned card when renaming and preserves other pins', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([
        { network: 'regtest', label: 'Old', card: { version: 0, name: 'Old', markets: [] } },
        { network: 'regtest', label: 'Other', card: { version: 0, name: 'Other', markets: [] } },
      ]),
    )
    renderSolvers()
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify({ version: 0, name: 'New', markets: [] }) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(readSolverCards().map(({ label }) => label)).toEqual(['Other', 'New']))
    expect(screen.queryByText('Old')).not.toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('shows readable rails and display-unit flat fees', () => {
    const lightning = {
      ...btcUsdt,
      source: 'lightning',
      fee_flat: '500',
      base_asset: { ...btcUsdt.base_asset, id: 'arkade:mutinynet/slip44:1' },
      quote_asset: { id: 'bolt11:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    }
    renderSolvers('mutinynet', [{ ...btcUsdt, fee_flat: '500' }, lightning])
    expect(screen.getByText('Arkade BTC → Lightning BTC')).toBeInTheDocument()
    expect(screen.queryByText(solverDirectionKey(lightning, 'base', 'mutinynet'))).not.toBeInTheDocument()
    expect(screen.getAllByText(/30 bps \+ 500 sats/)).toHaveLength(2)
    expect(screen.getAllByText(/30 bps \+ 5 USDT/)).toHaveLength(2)
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
