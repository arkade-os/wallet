import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { AspContext } from '../../../providers/asp'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { AssetSwap } from '../../../lib/swap/store'
import { Unit } from '../../../lib/types'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

import { btcDepix, btcUsdt, USDT_ID } from '../../lib/swap/fixtures'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

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
  swapAvailable: true,
  swaps: [] as AssetSwap[],
  createSwap: vi.fn().mockResolvedValue(pendingSwap),
  cancelSwap: vi.fn().mockResolvedValue(undefined),
}

const svcWallet = { getBalance: () => Promise.resolve({ available: 100_000 }) }

const renderSwap = (overrides: Partial<typeof mockAssetSwapsValue> = {}, unit = Unit.BTC) =>
  render(
    <ConfigContext.Provider
      value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, unit } } as any}
    >
      <AspContext.Provider value={mockAspContextValue as any}>
        <NavigationContext.Provider value={mockNavigationContextValue as any}>
          <WalletContext.Provider value={{ ...mockWalletContextValue, svcWallet: svcWallet as any } as any}>
            <AssetSwapsContext.Provider value={{ ...mockAssetSwapsValue, ...overrides }}>
              <WalletSwap />
            </AssetSwapsContext.Provider>
          </WalletContext.Provider>
        </NavigationContext.Provider>
      </AspContext.Provider>
    </ConfigContext.Provider>,
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
    await waitFor(() => expect(screen.getByText('Select asset')).toBeInTheDocument())

    // pick the receive asset from the drawer
    fireEvent.click(screen.getByText('Select asset'))
    await waitFor(() => expect(screen.getByText('Choose asset to receive')).toBeInTheDocument())
    fireEvent.click(screen.getByText('USDT'))

    // type 0.0001 BTC in the send input
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '0.0001' } })

    // debounced quote resolves: 10_000 sats -> 9.97 USDT
    await waitFor(() => expect(screen.getAllByText('≥ 9.97 USDT').length).toBeGreaterThan(0), { timeout: 3000 })

    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => expect(screen.getByText('Review swap')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Confirm swap'))
    await waitFor(() => expect(mockAssetSwapsValue.createSwap).toHaveBeenCalled())
    const plan = mockAssetSwapsValue.createSwap.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(10_000))
    expect(plan.receive.atomic).toBe(BigInt(997))
  })

  it('only offers receive assets that share a market with the from asset', async () => {
    renderSwap()
    fireEvent.click(screen.getByText('USDT'))
    await waitFor(() => expect(screen.getByText('Select asset')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Select asset'))
    await waitFor(() => expect(screen.getByText('Choose asset to receive')).toBeInTheDocument())
    // no USDT/DePix market: only btc can be received against USDT
    expect(screen.getAllByText('Bitcoin').length).toBeGreaterThan(0)
    expect(screen.queryByText('Decentralized Pix')).not.toBeInTheDocument()
  })

  it('types whole sats when the display unit is sats', async () => {
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 100000 } }))
    renderSwap({}, Unit.SATS)
    await waitFor(() => expect(screen.getByText('100K sats')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Bitcoin'))
    await waitFor(() => expect(screen.getByText('Select asset')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Select asset'))
    await waitFor(() => expect(screen.getByText('Choose asset to receive')).toBeInTheDocument())
    fireEvent.click(screen.getByText('USDT'))

    // the send label follows the configured unit and whole sats are accepted
    expect(screen.getByText('Send sats')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1000' } })
    expect(screen.getByRole('textbox')).toHaveValue('1000')

    // 1000 sats -> 0.99 USDT
    await waitFor(() => expect(screen.getAllByText('≥ 0.99 USDT').length).toBeGreaterThan(0), { timeout: 3000 })
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
