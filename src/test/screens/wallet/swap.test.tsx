import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { AssetSwap } from '../../../lib/swap/store'
import { mockAspContextValue, mockNavigationContextValue, mockWalletContextValue } from '../mocks'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const USDT_ID = 'f121ac9b7656797cc68d1e8fecacfbaa2069ec1461edf0bf2f3c37404cb9791a0000'
const DEPIX_ID = '47004bf4a5fbdb2221f708030528de68ea28f5980044e546b7bb5a352457d1f30000'

const btcUsdt: DiscoveredMarket = {
  pair: 'BTC/USDT',
  base_asset: { id: 'btc', name: 'Bitcoin', ticker: 'BTC', precision: 8 },
  quote_asset: { id: USDT_ID, name: 'USDT', ticker: 'USDT', precision: 2 },
  price_feed: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  price_feed_schema: { type: 'json', price_path: '/bitcoin/usd' },
  price_decimals: 6,
  invert: false,
  fee_bps: 30,
  min_base_amount: 1000,
  max_base_amount: 5000000,
  solver: 'frenchman',
  source: 'registry',
  sourceType: 'registry',
}

const btcDepix: DiscoveredMarket = {
  ...btcUsdt,
  pair: 'BTC/DePix',
  quote_asset: { id: DEPIX_ID, name: 'Decentralized Pix', ticker: 'DePix', precision: 8 },
  price_feed: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
  price_feed_schema: { type: 'json', price_path: '/price' },
  price_decimals: 0,
  solver: 'jpmorgan',
}

const pendingSwap: AssetSwap = {
  id: 'txid1',
  fromAsset: 'btc',
  toAsset: USDT_ID,
  fromAmount: '10000',
  toAmount: '992',
  swapAddress: 'tark1q...',
  swapPkScript: '5120' + 'ab'.repeat(32),
  offerHex: '0100',
  fundingTxid: 'txid1',
  status: 'pending',
  createdAt: 1,
}

const mockAssetSwapsValue = {
  markets: [btcUsdt, btcDepix],
  marketsLoaded: true,
  swapAvailable: true,
  swaps: [] as AssetSwap[],
  createSwap: vi.fn().mockResolvedValue(pendingSwap),
  cancelSwap: vi.fn().mockResolvedValue(undefined),
}

const svcWallet = { getBalance: () => Promise.resolve({ available: 100_000 }) }

const renderSwap = (overrides: Partial<typeof mockAssetSwapsValue> = {}) =>
  render(
    <AspContext.Provider value={mockAspContextValue as any}>
      <NavigationContext.Provider value={mockNavigationContextValue as any}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: svcWallet as any } as any}>
          <AssetSwapsContext.Provider value={{ ...mockAssetSwapsValue, ...overrides }}>
            <WalletSwap />
          </AssetSwapsContext.Provider>
        </WalletContext.Provider>
      </NavigationContext.Provider>
    </AspContext.Provider>,
  )

describe('Swap screen', () => {
  it('shows the unavailable state when no markets or emulator', () => {
    renderSwap({ swapAvailable: false })
    expect(screen.getByText('Swaps are unavailable')).toBeInTheDocument()
  })

  it('lists btc and the market-quoted assets with balances', async () => {
    renderSwap()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.getByText('USDT')).toBeInTheDocument()
    expect(screen.getByText('Decentralized Pix')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('0.001 BTC')).toBeInTheDocument())
  })

  it('quotes a btc to usdt swap and confirms it', async () => {
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 100000 } }))
    renderSwap()

    fireEvent.click(screen.getByText('Bitcoin'))
    await waitFor(() => expect(screen.getByText('Choose asset')).toBeInTheDocument())

    // pick the receive asset from the drawer
    fireEvent.click(screen.getByText('Choose asset'))
    await waitFor(() => expect(screen.getByText('Choose asset to receive')).toBeInTheDocument())
    fireEvent.click(screen.getByText('USDT'))

    // type 0.0001 BTC on the keypad
    for (const key of ['.', '0', '0', '0', '1']) {
      fireEvent.click(screen.getByRole('button', { name: key === '.' ? '.' : key }))
    }

    // debounced quote resolves: 10_000 sats -> 9.92 USDT
    await waitFor(() => expect(screen.getByText('≥ 9.92 USDT')).toBeInTheDocument(), { timeout: 3000 })

    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(screen.getByText('Review swap')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Confirm swap'))
    await waitFor(() => expect(mockAssetSwapsValue.createSwap).toHaveBeenCalled())
    const plan = mockAssetSwapsValue.createSwap.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(10_000))
    expect(plan.receive.atomic).toBe(BigInt(992))
  })

  it('lists swaps and cancels a pending one', async () => {
    renderSwap({ swaps: [pendingSwap] })
    expect(screen.getByText('Your swaps')).toBeInTheDocument()
    expect(screen.getByText('BTC to USDT')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    await waitFor(() => expect(mockAssetSwapsValue.cancelSwap).toHaveBeenCalledWith('txid1'))
  })
})
