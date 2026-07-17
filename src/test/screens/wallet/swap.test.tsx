import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { AspContext } from '../../../providers/asp'
import { AssetsContext } from '../../../providers/assets'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import type { AssetSwap } from '../../../lib/swap/store'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'
import { btcDepix, btcUsdt, DEPIX_ID, USDT_ID } from '../../lib/swap/fixtures'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const pendingSwap: AssetSwap = {
  id: 'funding-txid',
  fromAsset: 'btc',
  toAsset: USDT_ID,
  fromAmount: '10000',
  toAmount: '997',
  swapAddress: 'tark1q...',
  swapPkScript: `5120${'ab'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: 'funding-txid',
  status: 'pending',
  createdAt: 1,
  quote: {
    fromName: 'Bitcoin',
    fromTicker: 'BTC',
    fromDecimals: 8,
    toName: 'USD',
    toTicker: 'USD',
    toDecimals: 2,
    feeBps: 30,
    rate: '99700',
    fiatCurrency: 'USD',
    fromFiatAmount: 10,
    toFiatAmount: 9.97,
    quotedAt: 1,
  },
}

const createSwap = vi.fn().mockResolvedValue(pendingSwap)
const cancelSwap = vi.fn().mockResolvedValue(undefined)

function renderSwap({
  flow = {},
  swap = {},
}: {
  flow?: Record<string, unknown>
  swap?: Record<string, unknown>
} = {}) {
  const navigate = vi.fn()
  const goBack = vi.fn()
  const assetMetadataCache = new Map([
    [USDT_ID, { metadata: { name: 'USDT', ticker: 'USDT', decimals: 2 } }],
    [DEPIX_ID, { metadata: { name: 'Decentralized Pix', ticker: 'DEPIX', decimals: 8 } }],
  ])

  const view = render(
    <AspContext.Provider
      value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' } } as any}
    >
      <AssetsContext.Provider value={{ isRegistered: () => true }}>
        <NavigationContext.Provider
          value={{ ...mockNavigationContextValue, goBack, navigate, screen: Pages.WalletSwap } as any}
        >
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <FiatContext.Provider
              value={
                {
                  ...mockFiatContextValue,
                  toFiat: (sats?: number) => ((sats ?? 0) / 100_000_000) * 100_000,
                } as any
              }
            >
              <FlowContext.Provider value={{ ...mockFlowContextValue, ...flow } as any}>
                <WalletContext.Provider
                  value={
                    {
                      ...mockWalletContextValue,
                      balance: 250_000,
                      assetBalances: [
                        { assetId: USDT_ID, amount: BigInt(15_000) },
                        { assetId: DEPIX_ID, amount: BigInt(2_000_000_000) },
                      ],
                      assetMetadataCache,
                      svcWallet: { getBalance: () => Promise.resolve({ available: 100_000 }) },
                    } as any
                  }
                >
                  <AssetSwapsContext.Provider
                    value={
                      {
                        markets: [btcUsdt, btcDepix],
                        swapAvailable: true,
                        swaps: [],
                        createSwap,
                        cancelSwap,
                        ...swap,
                      } as any
                    }
                  >
                    <WalletSwap />
                  </AssetSwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </NavigationContext.Provider>
      </AssetsContext.Provider>
    </AspContext.Provider>,
  )

  return { ...view, goBack, navigate }
}

describe('Wallet swap flow', () => {
  beforeEach(() => {
    createSwap.mockClear()
    cancelSwap.mockClear()
    fetchMocker.resetMocks()
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 100_000 }, price: '500000' }))
  })

  it('shows the unavailable state when the PR 784 swap service is unavailable', () => {
    renderSwap({ swap: { swapAvailable: false } })
    expect(screen.getByText('Swaps are unavailable')).toBeInTheDocument()
  })

  it('shows designated Mutinynet assets as separate USD and BRL accounts', () => {
    renderSwap()
    expect(screen.getByText('Choose asset to swap')).toBeInTheDocument()
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('BRL')).toBeInTheDocument()
    expect(screen.queryByText('USDT')).not.toBeInTheDocument()
    expect(screen.queryByText('DEPIX')).not.toBeInTheDocument()
  })

  it('opens directly with bitcoin selected when launched from bitcoin detail', () => {
    const setSwapFromAssetId = vi.fn()
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId } })

    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.queryByText('Choose asset to swap')).not.toBeInTheDocument()
    expect(setSwapFromAssetId).toHaveBeenCalledWith(undefined)
  })

  it('opens directly with USD selected when launched from the USDT-backed account', () => {
    renderSwap({ flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })
    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0)
  })

  it('submits the live PR 784 offer plan and a historical display snapshot', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: '0' }))

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(createSwap.mock.calls[0][0].deposit.atomic).toBe(BigInt(50_000))
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromTicker: 'BTC', toTicker: 'USD', feeBps: 30 })
  })

  it('keeps PR 784 pending-swap cancellation available', async () => {
    renderSwap({ swap: { swaps: [pendingSwap] } })
    expect(screen.getByText('BTC to USD')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(cancelSwap).toHaveBeenCalledWith('funding-txid'))
  })
})
