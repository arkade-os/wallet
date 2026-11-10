import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue } from '../mocks'
import { readSolverCards } from '../../../lib/solverCards'
import { prettyLongText } from '../../../lib/format'
import { SwapsContext } from '../../../providers/swaps'
import { btcUsdt } from '../../lib/swapFixtures'
import { isSolverCardEnabled, readSolverRouting, saveSolverRouting } from '../../../lib/solverRouting'
import { solverDirectionKey, solverId, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { solverHealth } from '../../../lib/solverHealth'

if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', { writable: true, configurable: true, value: MouseEvent })
}

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

function renderSolvers(
  network: string = 'regtest',
  allMarkets: DiscoveredMarket[] = [],
  view: 'priority' | 'cards' = 'cards',
) {
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

  const result = render(
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
  if (view === 'cards') fireEvent.click(screen.getByRole('tab', { name: 'Cards' }))
  return result
}

describe('Solvers screen', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSolverUsage.mockReset().mockResolvedValue({})
    mockFetchTransportCards.mockReset()
    mockFetchTransportCards.mockResolvedValue([])
  })

  it('explains reliability demotion while keeping the preferred choice and enable switch', async () => {
    const preferred = { ...btcUsdt, solver: 'Preferred', source: 'preferred' }
    const other = { ...btcUsdt, solver: 'Other', source: 'other' }
    const scope = { network: 'mutinynet', direction: solverDirectionKey(preferred, 'base', 'mutinynet') }
    const id = solverId(preferred, scope.network)
    saveSolverRouting(scope.network, scope.direction, { mode: 'usage', preferFirst: id })
    await solverHealth.record(scope, id, 'failure')
    await solverHealth.record(scope, id, 'failure')
    renderSolvers(scope.network, [preferred, other], 'priority')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent(
        'Preferred solver cooling down',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    expect(screen.getByRole('combobox', { name: /^Prefer first/ })).toHaveValue(id)
    expect(screen.getByRole('switch', { name: 'Use Preferred for this direction' })).toBeChecked()
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[0]).toHaveTextContent('Other')
    expect(within(screen.getByRole('dialog')).getByText('Temporarily deprioritized')).toBeInTheDocument()
    await act(async () => solverHealth.record(scope, id, 'success'))
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).queryByText('Temporarily deprioritized')).not.toBeInTheDocument(),
    )
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[0]).toHaveTextContent('Preferred')
    expect(readSolverRouting(scope.network, scope.direction)).toMatchObject({ mode: 'usage', preferFirst: id })
  })

  it('saves one preferred solver per direction and keeps automatic ordering across reloads', async () => {
    const popular = { ...btcUsdt, solver: 'Popular', source: 'popular' }
    const preferred = { ...btcUsdt, solver: 'Preferred', source: 'preferred' }
    const other = { ...btcUsdt, solver: 'Other', source: 'other' }
    const id = solverId(preferred, 'mutinynet')
    const direction = solverDirectionKey(preferred, 'base', 'mutinynet')
    mockSolverUsage.mockResolvedValue({ [solverId(popular, 'mutinynet')]: 20, [solverId(other, 'mutinynet')]: 10 })
    const view = renderSolvers('mutinynet', [popular, preferred, other], 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    fireEvent.change(screen.getByRole('combobox', { name: /^Prefer first/ }), { target: { value: id } })
    fireEvent.change(screen.getByRole('combobox', { name: /^Sort the rest by/ }), { target: { value: 'usage' } })
    await waitFor(() =>
      expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[1]).toHaveTextContent('Popular'),
    )
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[0]).toHaveTextContent('Preferred')
    expect(within(screen.getByRole('dialog')).getAllByRole('listitem')[2]).toHaveTextContent('Other')
    fireEvent.change(screen.getByRole('combobox', { name: /^Sort the rest by/ }), { target: { value: 'cost' } })
    expect(readSolverRouting('mutinynet', direction)).toMatchObject({ mode: 'cost', preferFirst: id })
    view.unmount()
    renderSolvers('mutinynet', [popular, preferred, other], 'priority')
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('Preferred first')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade USDT → Arkade BTC' }))
    expect(screen.getByRole('combobox', { name: /^Prefer first/ })).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    expect(screen.getByRole('combobox', { name: /^Prefer first/ })).toHaveValue(id)
    fireEvent.click(screen.getByRole('switch', { name: 'Use Preferred for this direction' }))
    expect(screen.getByRole('combobox', { name: /^Prefer first/ })).toHaveValue(id)
    expect(readSolverRouting('mutinynet', direction).disabled).toContain(id)
    fireEvent.change(screen.getByRole('combobox', { name: /^Prefer first/ }), { target: { value: '' } })
    expect(readSolverRouting('mutinynet', direction).preferFirst).toBeUndefined()
    expect(readSolverRouting('mutinynet', direction).mode).toBe('cost')
  })

  it('keeps the preferred solver fixed while manually reordering the remainder', () => {
    const candidates = ['One', 'Two', 'Three'].map((solver) => ({ ...btcUsdt, solver, source: solver }))
    const direction = solverDirectionKey(candidates[0], 'base', 'mutinynet')
    const id = solverId(candidates[0], 'mutinynet')
    saveSolverRouting('mutinynet', direction, { preferFirst: id })
    renderSolvers('mutinynet', candidates, 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    expect(screen.getByRole('button', { name: 'Move down One' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move up Two' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Move up Three' }))
    expect(readSolverRouting('mutinynet', direction)).toMatchObject({
      preferFirst: id,
      priority: [id, solverId(candidates[2], 'mutinynet'), solverId(candidates[1], 'mutinynet')],
    })
  })

  it('retains an unavailable preferred solver when clearing the preference cannot be saved', () => {
    const direction = solverDirectionKey(btcUsdt, 'base', 'mutinynet')
    saveSolverRouting('mutinynet', direction, { mode: 'cost', preferFirst: 'missing' })
    renderSolvers('mutinynet', [btcUsdt], 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    expect(screen.getByRole('combobox', { name: /^Prefer first/ })).toHaveValue('missing')
    expect(screen.getByRole('option', { name: 'Unavailable solver' })).toBeInTheDocument()
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    fireEvent.change(screen.getByRole('combobox', { name: /^Prefer first/ }), { target: { value: '' } })
    expect(screen.getByRole('combobox', { name: /^Prefer first/ })).toHaveValue('missing')
    expect(screen.getByText(/Failed to save/)).toBeInTheDocument()
    write.mockRestore()
  })

  it('groups independently identified same-name discovered and local solvers and persists direction priority', async () => {
    const first = { ...btcUsdt, solver: 'Same name', discovery_pubkey: 'a'.repeat(64) }
    const second = { ...first, discovery_pubkey: 'b'.repeat(64), sourceType: 'local' as const }
    renderSolvers('mutinynet', [first, second], 'priority')
    expect(screen.getByRole('tab', { name: 'Priority' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Same name')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /^Arkade .+ → Arkade/ })[0])
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getAllByText('Same name')).toHaveLength(2)
    expect(screen.getByText(`${prettyLongText(first.discovery_pubkey)} · registry`)).toBeInTheDocument()
    expect(screen.getByText(`${prettyLongText(second.discovery_pubkey)} · local`)).toBeInTheDocument()
    expect(screen.queryByText(`${prettyLongText(solverId(first, 'mutinynet'))} · registry`)).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down Same name' })[0])
    const direction = solverDirectionKey(first, 'base', 'mutinynet')
    expect(readSolverRouting('mutinynet', direction).priority).toEqual([
      solverId(second, 'mutinynet'),
      solverId(first, 'mutinynet'),
    ])
    fireEvent.change(screen.getByRole('combobox', { name: /^Order solvers by/ }), { target: { value: 'cost' } })
    expect(readSolverRouting('mutinynet', direction).mode).toBe('cost')
    expect(screen.getByText(/Costs are estimated at the trade amount/)).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: /^Order solvers by/ }), { target: { value: 'usage' } })
    expect(readSolverRouting('mutinynet', direction).mode).toBe('usage')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('Most used')
    fireEvent.click(screen.getByRole('tab', { name: 'Cards' }))
    expect(screen.queryByRole('button', { name: /^Arkade .+ → Arkade/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Priority' }))
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('Most used')
  })

  it('shows an error when completed usage cannot be loaded', async () => {
    mockSolverUsage.mockRejectedValue(new Error('storage unavailable'))
    renderSolvers('mutinynet', [btcUsdt], 'priority')
    expect(mockSolverUsage).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: /^Arkade .+ → Arkade/ })[0])
    expect(await screen.findByText('Unable to load completed swap usage.')).toBeInTheDocument()
  })

  it('keeps paused direction candidates visible and preserves their priority across mode changes', () => {
    const first = { ...btcUsdt, solver: 'First', source: 'first' }
    const second = { ...btcUsdt, solver: 'Second', source: 'second' }
    renderSolvers('mutinynet', [first, second], 'priority')
    const direction = solverDirectionKey(first, 'base', 'mutinynet')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Use First for this direction' }))
    expect(screen.getByRole('switch', { name: 'Use First for this direction' })).not.toBeChecked()
    expect(screen.getByText('Paused')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move up Second' }))
    const priority = [solverId(second, 'mutinynet'), solverId(first, 'mutinynet')]
    expect(readSolverRouting('mutinynet', direction)).toMatchObject({
      priority,
      disabled: [solverId(first, 'mutinynet')],
    })
    fireEvent.change(screen.getByRole('combobox', { name: /^Order solvers by/ }), { target: { value: 'cost' } })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('1/2 enabled')
    fireEvent.click(screen.getByRole('tab', { name: 'Cards' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Priority' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Use First for this direction' }))
    expect(readSolverRouting('mutinynet', direction)).toEqual({ mode: 'cost', priority })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arkade USDT → Arkade BTC' }))
    expect(screen.getByRole('switch', { name: 'Use First for this direction' })).toBeChecked()
  })

  it('pauses a whole card without removing it and keeps its direction controls available', () => {
    const input = { network: 'mutinynet', label: 'Pin', card: { version: 0, name: 'Pin', markets: [] } }
    localStorage.setItem('solverCards', JSON.stringify([input]))
    const market = { ...btcUsdt, solver: 'Pin', source: 'Pin', sourceType: 'local' as const }
    const original = localStorage.getItem('solverCards')
    renderSolvers('mutinynet', [market])
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Pin for new swaps' }))
    expect(localStorage.getItem('solverCards')).toBe(original)
    expect(screen.getByRole('switch', { name: 'Enable Pin for new swaps' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('tab', { name: 'Priority' }))
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('0/1 enabled')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    const directionSwitch = screen.getByRole('switch', { name: 'Use Pin for this direction' })
    expect(directionSwitch).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(directionSwitch)
    expect(directionSwitch).not.toBeChecked()
    expect(screen.getByText('Paused for all directions')).toBeInTheDocument()
    expect(screen.getByText('No solvers enabled for this direction.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Enable card:/ }))
    expect(directionSwitch).toBeChecked()
    expect(screen.getByRole('combobox', { name: /^Order solvers by/ })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Cards' }))
    expect(screen.getByRole('switch', { name: 'Enable Pin for new swaps' })).toBeChecked()
    fireEvent.click(screen.getByRole('tab', { name: 'Priority' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    expect(screen.getByRole('switch', { name: 'Use Pin for this direction' })).toBeChecked()
  })

  it('shows a failed card-pause write without changing the switch', () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pin', card: { version: 0, name: 'Pin', markets: [] } }]),
    )
    renderSolvers()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('full')
    })
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Pin for new swaps' }))
    expect(screen.getByRole('switch', { name: 'Enable Pin for new swaps' })).toBeChecked()
    expect(screen.getByText(/Failed to save|Unable to save/i)).toBeInTheDocument()
    setItem.mockRestore()
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
    renderSolvers('regtest', [], 'priority')

    fireEvent.click(screen.getByRole('button', { name: '+ Add new' }))
    expect(screen.getByRole('dialog', { name: 'Solver card' })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify({ version: 0, name: 'My Card', markets: [] }) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('My Card')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Cards' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('switch', { name: 'Enable Old for new swaps' }))
    const editButton = screen.getAllByRole('button', { name: 'Edit' })[0]
    editButton.focus()
    fireEvent.click(editButton)
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify({ version: 0, name: 'New', markets: [] }) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(readSolverCards().map(({ label }) => label)).toEqual(['Other', 'New']))
    expect(screen.queryByText('Old')).not.toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(isSolverCardEnabled(readSolverCards().find(({ label }) => label === 'New')!)).toBe(false)
    expect(screen.getByRole('switch', { name: 'Enable New for new swaps' })).not.toBeChecked()
    await waitFor(() => expect(screen.getByRole('button', { name: '+ Add new' })).toHaveFocus())
  })

  it('shows readable rails and display-unit flat fees', () => {
    const lightning = {
      ...btcUsdt,
      source: 'lightning',
      fee_flat: '500',
      base_asset: { ...btcUsdt.base_asset, id: 'arkade:mutinynet/slip44:1' },
      quote_asset: { id: 'bolt11:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    }
    renderSolvers('mutinynet', [{ ...btcUsdt, fee_flat: '500' }, lightning], 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Lightning BTC' }))
    expect(screen.queryByText(solverDirectionKey(lightning, 'base', 'mutinynet'))).not.toBeInTheDocument()
    expect(screen.getByText(/30 bps \+ 500 sats/)).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getAllByRole('button', { name: /^Arkade .+ → Arkade/ })[0])
    expect(screen.getByText(/30 bps \+ 5 USDT/)).toBeInTheDocument()
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
    expect(within(screen.getByRole('dialog')).getByText(prettyLongText(pubkey))).toBeInTheDocument()
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
    expect(within(screen.getByRole('dialog')).queryByRole('tab')).not.toBeInTheDocument()
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
