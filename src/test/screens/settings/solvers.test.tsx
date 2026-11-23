import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Solvers from '../../../screens/Settings/Solvers'
import { AspContext } from '../../../providers/asp'
import { BackupContext } from '../../../providers/backup'
import { mockAspContextValue, mockWalletContextValue } from '../mocks'
import { WalletContext } from '../../../providers/wallet'
import { readSolverCards } from '../../../lib/solverCards'
import { prettyLongText } from '../../../lib/format'
import { SwapsContext } from '../../../providers/swaps'
import { btcUsdt, USDT_ID } from '../../lib/swapFixtures'
import { isSolverCardEnabled, isSolverEnabled, readSolverRouting, saveSolverRouting } from '../../../lib/solverRouting'
import { solverDirectionKey, solverId, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { solverHealth } from '../../../lib/solverHealth'
import {
  readOnchainSendPreference,
  readOpenOfferPolicy,
  readOpenOffersFirst,
  saveOpenOfferPolicy,
} from '../../../lib/openOfferPolicy'

if (!window.PointerEvent) {
  Object.defineProperty(window, 'PointerEvent', { writable: true, configurable: true, value: MouseEvent })
}

const ReactSwapsDefault = {
  allMarkets: [],
  markets: [],
  swaps: [],
  swapAvailable: false,
  discoveryReady: true,
  runDiscovery: vi.fn(),
  quoteExchange: vi.fn(),
  openSwapQuotes: vi.fn(),
  openPaymentQuotes: vi.fn(),
  cancelOpenSwapQuotes: vi.fn(),
  chooseSwapQuote: vi.fn(),
  acceptSwapQuote: vi.fn(),
  cancelSwap: vi.fn(),
  recoverSwap: vi.fn(),
  quotePay: vi.fn(),
  quoteAssetPayment: vi.fn(),
  quotePaymentRoute: vi.fn(),
  paymentRouteCandidates: vi.fn(),
  onchainPaymentRouteCandidates: vi.fn(),
  acceptPay: vi.fn(),
  acceptPaymentQuote: vi.fn(),
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

// as the mutinynet solver publishes it: CAIP-19 legs, and a ticker cut from the asset id
const pinnedUsdt = {
  base_asset: { id: 'arkade:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
  quote_asset: {
    id: `arkade:mutinynet/asset:${USDT_ID}`,
    name: 'Arkade asset f121ac9b',
    ticker: 'f121ac9b',
    decimals: 2,
  },
  fee_bps: 10,
  price_feed: btcUsdt.price_feed,
  price_feed_schema: btcUsdt.price_feed_schema,
  price_decimals: 6,
  min_base_amount: '1000',
  max_base_amount: '100000000',
  min_quote_amount: '100',
  max_quote_amount: '63000',
}
const pinnedSource = { solver: 'ln-solver', source: 'ln-solver', sourceType: 'local' as const }
const usdtMetadata = new Map([[USDT_ID, { metadata: { name: 'USDT', ticker: 'USDT', decimals: 2 } }]])

function renderSolvers(
  network: string = 'regtest',
  allMarkets: DiscoveredMarket[] = [],
  view: 'priority' | 'cards' = 'cards',
  wallet: Record<string, unknown> = {},
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

  const tree = (swaps = ReactSwapsDefault.swaps) => (
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network } } as any}
    >
      <BackupContext.Provider value={backupContextValue as any}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, ...wallet } as any}>
          <SwapsContext.Provider value={{ ...ReactSwapsDefault, allMarkets, swaps }}>
            <Solvers />
          </SwapsContext.Provider>
        </WalletContext.Provider>
      </BackupContext.Provider>
    </AspContext.Provider>
  )
  const result = render(tree())
  if (view === 'cards') fireEvent.click(screen.getByRole('tab', { name: 'Providers' }))
  return { ...result, updateSwaps: () => result.rerender(tree([])) }
}

describe('Solvers screen', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSolverUsage.mockReset().mockResolvedValue({})
    mockFetchTransportCards.mockReset()
    mockFetchTransportCards.mockResolvedValue([])
  })

  it('keeps open-offer consent separate for each wallet network', () => {
    const view = renderSolvers('mutinynet', [], 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Open offers When needed' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Open offers' }))
    expect(dialog.getByText('Searching shares your pair and amount publicly.')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: /^When needed/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(dialog.getByRole('button', { name: /^Ask first/ }))
    expect(readOpenOfferPolicy('mutinynet')).toBe('ask')
    expect(readOpenOfferPolicy('bitcoin')).toBe('when-needed')
    view.unmount()
    renderSolvers('mutinynet', [], 'priority')
    expect(screen.getByRole('button', { name: 'Open offers Ask first' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the open-offer settings available when saving fails', () => {
    renderSolvers('mutinynet', [], 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Open offers When needed' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Open offers' }))
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    try {
      fireEvent.click(dialog.getByRole('button', { name: /^Ask first/ }))
      expect(dialog.getByText(/Failed to save/)).toBeInTheDocument()
      expect(dialog.getByRole('button', { name: /^When needed/ })).toHaveAttribute('aria-pressed', 'true')
      expect(readOpenOfferPolicy('mutinynet')).toBe('when-needed')
    } finally {
      write.mockRestore()
    }
  })

  it('starts with open offers only for the selected route and keeps its provider enabled', () => {
    const network = 'mutinynet'
    const direction = solverDirectionKey(btcUsdt, 'base', network)
    const reverse = solverDirectionKey(btcUsdt, 'quote', network)
    const order = { mode: 'cost' as const, preferFirst: solverId(btcUsdt, network) }
    saveSolverRouting(network, direction, order)
    const forwardName = 'Arkade BTC → Arkade USDT'
    const reverseName = 'Arkade USDT → Arkade BTC'
    const view = renderSolvers(network, [btcUsdt], 'priority')
    fireEvent.click(screen.getByRole('button', { name: forwardName }))
    const openOffers = () => within(screen.getByRole('dialog')).getByRole('switch', { name: 'Start with Open offers' })
    expect(openOffers()).not.toBeChecked()
    fireEvent.click(openOffers())
    expect(openOffers()).toBeChecked()
    expect(readOpenOffersFirst(network, direction)).toBe(true)
    expect(readOpenOffersFirst(network, reverse)).toBe(false)
    expect(readOpenOffersFirst('bitcoin', direction)).toBe(false)
    expect(readSolverRouting(network, direction)).toMatchObject(order)
    expect(isSolverEnabled(btcUsdt, 'base', network)).toBe(true)

    view.unmount()
    renderSolvers(network, [btcUsdt], 'priority')
    expect(screen.getByRole('button', { name: forwardName })).toHaveTextContent('Open offers first')
    fireEvent.click(screen.getByRole('button', { name: reverseName }))
    expect(openOffers()).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: forwardName }))
    expect(openOffers()).toBeChecked()

    act(() => saveOpenOfferPolicy(network, 'off'))
    expect(openOffers()).toHaveAttribute('aria-disabled', 'true')
    expect(readOpenOffersFirst(network, direction)).toBe(true)
    act(() => saveOpenOfferPolicy(network, 'when-needed'))
    expect(openOffers()).not.toHaveAttribute('aria-disabled', 'true')
    expect(openOffers()).toBeChecked()
    fireEvent.click(openOffers())
    expect(readOpenOffersFirst(network, direction)).toBe(false)
  })

  it('shows the wallet exit without a solver and keeps method selection separate from solver order', () => {
    const walletOnly = renderSolvers('mutinynet', [], 'priority')
    const routeName = 'Arkade BTC → Bitcoin BTC'
    expect(screen.getByRole('button', { name: routeName })).toHaveTextContent('Collaborative exit')
    walletOnly.unmount()

    const market = {
      ...btcUsdt,
      base_asset: { id: 'arkade:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: 'bitcoin:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
    }
    const direction = solverDirectionKey(market, 'base', 'mutinynet')
    const id = solverId(market, 'mutinynet')
    saveSolverRouting('mutinynet', direction, { mode: 'usage', preferFirst: id })
    renderSolvers('mutinynet', [market], 'priority')
    fireEvent.click(screen.getByRole('button', { name: routeName }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('switch', { name: 'Start with Open offers' })).not.toBeInTheDocument()
    const method = within(dialog).getByRole('combobox', { name: 'First payment method' })
    expect(method).toHaveValue('solver')
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(method, { target: { value: 'exit' } })
    expect(readOnchainSendPreference('mutinynet')).toBe('exit')
    expect(readSolverRouting('mutinynet', direction)).toMatchObject({ mode: 'usage', preferFirst: id })
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
    expect(screen.getByRole('button', { name: 'Clear first choice: Preferred' })).toHaveTextContent('Clear')
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
    fireEvent.click(screen.getByRole('button', { name: 'Try first: Preferred' }))
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
    expect(screen.queryByRole('button', { name: 'Clear first choice: Preferred' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    expect(screen.getByRole('button', { name: 'Clear first choice: Preferred' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Use Preferred for this direction' }))
    expect(screen.getByRole('button', { name: 'Clear first choice: Preferred' })).toBeInTheDocument()
    expect(readSolverRouting('mutinynet', direction).disabled).toContain(id)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('Preferred paused')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear first choice: Preferred' }))
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
    expect(screen.getByText('Unavailable solver')).toBeInTheDocument()
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Clear first choice' }))
    expect(readSolverRouting('mutinynet', direction).preferFirst).toBe('missing')
    expect(screen.getByText('Unavailable solver')).toBeInTheDocument()
    expect(screen.getByText(/Failed to save/)).toBeInTheDocument()
    write.mockRestore()
  })

  it('groups independently identified same-name discovered and local solvers and persists direction priority', async () => {
    const first = { ...btcUsdt, solver: 'Same name', discovery_pubkey: 'a'.repeat(64) }
    const second = { ...first, discovery_pubkey: 'b'.repeat(64), sourceType: 'local' as const }
    renderSolvers('mutinynet', [first, second], 'priority')
    expect(screen.getByRole('tab', { name: 'Routes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('combobox', { name: /^Order solvers by/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Same name')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /^Arkade .+ → Arkade/ })[0])
    expect(within(screen.getByRole('dialog')).getAllByRole('combobox')).toHaveLength(1)
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
    expect(screen.queryByRole('combobox', { name: /^Order solvers by/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('Most used')
    fireEvent.click(screen.getByRole('tab', { name: 'Providers' }))
    expect(screen.queryByRole('button', { name: /^Arkade .+ → Arkade/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Routes' }))
    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toHaveTextContent('Most used')
  })

  it('shows an error when completed usage cannot be loaded', async () => {
    mockSolverUsage.mockRejectedValue(new Error('storage unavailable'))
    renderSolvers('mutinynet', [btcUsdt], 'priority')
    expect(mockSolverUsage).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: /^Arkade .+ → Arkade/ })[0])
    expect(await screen.findByText('Unable to load completed swap usage.')).toBeInTheDocument()
  })

  it('stops ranking by stale usage when a later refresh fails', async () => {
    const first = { ...btcUsdt, solver: 'First', source: 'first' }
    const popular = { ...btcUsdt, solver: 'Popular', source: 'popular' }
    saveSolverRouting('mutinynet', solverDirectionKey(first, 'base', 'mutinynet'), { mode: 'usage' })
    mockSolverUsage.mockResolvedValue({ [solverId(popular, 'mutinynet')]: 5 })
    const view = renderSolvers('mutinynet', [first, popular], 'priority')
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' }))
    const rows = () => within(screen.getByRole('dialog')).getAllByRole('listitem')
    await waitFor(() => expect(rows()[0]).toHaveTextContent('Popular'))
    mockSolverUsage.mockRejectedValue(new Error('storage unavailable'))
    view.updateSwaps()
    expect(await screen.findByText('Unable to load completed swap usage.')).toBeInTheDocument()
    expect(rows()[0]).toHaveTextContent('First')
    expect(screen.queryByText(/5 completed swaps/)).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('tab', { name: 'Providers' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Routes' }))
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
    fireEvent.click(screen.getByRole('tab', { name: 'Routes' }))
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
    fireEvent.click(screen.getByRole('tab', { name: 'Providers' }))
    expect(screen.getByRole('switch', { name: 'Enable Pin for new swaps' })).toBeChecked()
    fireEvent.click(screen.getByRole('tab', { name: 'Routes' }))
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
      fireEvent.click(screen.getByRole('button', { name: 'Add provider' }))
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

  it('shows an empty state when no providers are available', () => {
    renderSolvers()

    expect(screen.getByText('Payment routes')).toBeInTheDocument()
    expect(screen.getByText('No providers available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add provider' })).toBeInTheDocument()
  })

  it('shows the bundled mainnet card as read-only, so the pinned solver is visible', () => {
    renderSolvers('bitcoin')

    expect(screen.getByText('beta-solver')).toBeInTheDocument()
    expect(screen.getByText('Built-in')).toBeInTheDocument()
    expect(screen.queryByText('No providers available.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('adds a solver card and renders it in the list', async () => {
    renderSolvers('regtest', [], 'priority')

    fireEvent.click(screen.getByRole('tab', { name: 'Providers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add provider' }))
    expect(screen.getByRole('dialog', { name: 'Solver card' })).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify({ version: 0, name: 'My Card', markets: [] }) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('My Card')).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Providers' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(readSolverCards()).toHaveLength(1)
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('labels a pointer card instead of listing no pairs', () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pointer', card: { version: 0, name: 'Pointer' } }]),
    )
    renderSolvers()

    expect(screen.getByText('Markets published by the solver')).toBeInTheDocument()
  })

  it('derives a canonical card’s market details from its asset ids', () => {
    renderSolvers('bitcoin')

    expect(screen.getByText('1 market')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Details for beta-solver' }))
    expect(within(screen.getByRole('dialog')).getByText('Arkade BTC → Lightning BTC')).toBeInTheDocument()
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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add provider' })).toHaveFocus())
  })

  it.each([
    ['keyless', 'Edit', undefined],
    ['keyed', 'Edit', 'a'.repeat(64)],
    ['keyed', 'Add provider', 'a'.repeat(64)],
  ])('keeps a direction pause when a %s card is saved under a new name via %s', async (_, button, key) => {
    const card = (name: string) => ({ version: 0, name, discovery_pubkey: key, markets: [pinnedUsdt] })
    const market = (name: string) => ({
      ...pinnedUsdt,
      solver: name,
      source: name,
      sourceType: 'local' as const,
      discovery_pubkey: key,
    })
    localStorage.setItem('solverCards', JSON.stringify([{ network: 'mutinynet', label: 'Old', card: card('Old') }]))
    saveSolverRouting('mutinynet', solverDirectionKey(market('Old'), 'base', 'mutinynet'), {
      disabled: [solverId(market('Old'), 'mutinynet')],
    })
    renderSolvers('mutinynet')
    fireEvent.click(screen.getByRole('button', { name: button }))
    fireEvent.change(screen.getByPlaceholderText('{ version: 0, name: "My Card", markets: [...] }'), {
      target: { value: JSON.stringify(card('New')) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(readSolverCards().map(({ label }) => label)).toEqual(['New']))
    expect(isSolverEnabled(market('New'), 'base', 'mutinynet')).toBe(false)
    expect(isSolverEnabled(market('New'), 'quote', 'mutinynet')).toBe(true)
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
    expect(screen.queryByRole('button', { name: 'Lightning BTC → Arkade BTC' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Arkade BTC → Lightning BTC' }))
    expect(within(screen.getByRole('dialog')).getByText('BTC · Arkade')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('BTC · Lightning')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('switch', { name: 'Start with Open offers' })).not.toBeChecked()
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

  it('shows card info when the provider row is clicked', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Details for Pinned' }))

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

    fireEvent.click(screen.getByRole('button', { name: 'Details for Pinned' }))

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Original' })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: 'Current' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Current' }))
    await waitFor(() => expect(screen.getByText(/99,999/)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Original' }))
    await waitFor(() => expect(screen.queryByText(/99,999/)).not.toBeInTheDocument())
  })

  it('shows only the pinned card when no current card is available', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pinned', card: { version: 0, name: 'Pinned', markets: [] } }]),
    )
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: 'Details for Pinned' }))

    await waitFor(() => expect(screen.getByText('Solver card info')).toBeInTheDocument())
    expect(within(screen.getByRole('dialog')).queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByText(/no Nostr relays/)).toBeInTheDocument()
  })

  it('names a pinned card’s asset legs from the asset’s metadata, not the card’s text', () => {
    renderSolvers('mutinynet', [{ ...pinnedUsdt, ...pinnedSource }], 'priority', { assetMetadataCache: usdtMetadata })

    expect(screen.getByRole('button', { name: 'Arkade BTC → Arkade USDT' })).toBeInTheDocument()
    expect(screen.queryByText(/f121ac9b/)).not.toBeInTheDocument()
  })

  it('lists registry solvers read-only on the Providers tab', () => {
    renderSolvers('mutinynet', [btcUsdt])

    expect(screen.getByText('frenchman')).toBeInTheDocument()
    expect(screen.getByText('Registry')).toBeInTheDocument()
    expect(screen.queryByText('No providers available.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('states card limits in each leg’s units and leaves out a side the solver does not serve', async () => {
    const onchain = {
      base_asset: pinnedUsdt.base_asset,
      quote_asset: { id: 'bitcoin:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      fee_bps: 25,
      fee_flat: '500',
      min_base_amount: '0',
      max_base_amount: '0',
      min_quote_amount: '330',
      max_quote_amount: '10000000',
    }
    localStorage.setItem(
      'solverCards',
      JSON.stringify([
        {
          network: 'mutinynet',
          label: 'ln-solver',
          card: { version: 0, name: 'ln-solver', markets: [pinnedUsdt, onchain] },
        },
      ]),
    )
    renderSolvers('mutinynet', [], 'cards', { assetMetadataCache: usdtMetadata })

    fireEvent.click(screen.getByRole('button', { name: 'Details for ln-solver' }))
    const info = await screen.findByRole('dialog')
    expect(within(info).getByText('1 – 630 USDT')).toBeInTheDocument()
    expect(within(info).getByText('1,000 – 100,000,000 sats')).toBeInTheDocument()
    expect(within(info).getByText('330 – 10,000,000 sats')).toBeInTheDocument()
    expect(within(info).getByText('25 bps + 500 sats')).toBeInTheDocument()
    expect(within(info).queryByText('Bitcoin BTC → Arkade BTC')).not.toBeInTheDocument()
    expect(within(info).queryByText(/63,?000/)).not.toBeInTheDocument()
  })

  it('shows the raw card JSON in the detail view', async () => {
    localStorage.setItem(
      'solverCards',
      JSON.stringify([{ network: 'regtest', label: 'Pinned', card: { version: 0, name: 'Pinned', markets: [] } }]),
    )
    renderSolvers()

    fireEvent.click(screen.getByRole('button', { name: 'Details for Pinned' }))

    await waitFor(() => expect(screen.getByText('Solver card info')).toBeInTheDocument())
    fireEvent.click(screen.getByText('View raw JSON'))
    await waitFor(() => expect(screen.getByText(/"name": "Pinned"/)).toBeInTheDocument())
  })
})
