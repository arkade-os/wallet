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
import { Unit } from '../../../lib/types'
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
    fromTicker: 'BTC',
    fromDecimals: 8,
    toTicker: 'USD',
    toDecimals: 2,
    feeBps: 30,
    fiatCurrency: 'USD',
    fromFiatAmount: 10,
  },
}

const createSwap = vi.fn().mockResolvedValue(pendingSwap)
const cancelSwap = vi.fn().mockResolvedValue(undefined)

function renderSwap({
  flow = {},
  swap = {},
  config = {},
}: {
  flow?: Record<string, unknown>
  swap?: Record<string, unknown>
  config?: Record<string, unknown>
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
          <ConfigContext.Provider
            value={{ ...mockConfigContextValue, config: { ...mockConfigContextValue.config, ...config } } as any}
          >
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
                      isVerifiedAsset: () => true,
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

  it('finds Bitcoin when searching "btc", even though its swap-entry ticker is sats', async () => {
    renderSwap()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Search assets'), 'btc')

    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
  })

  it('opens directly with bitcoin selected when launched from bitcoin detail', () => {
    const setSwapFromAssetId = vi.fn()
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId } })

    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.queryByText('Choose asset to swap')).not.toBeInTheDocument()
    expect(setSwapFromAssetId).toHaveBeenCalledWith(undefined)
  })

  it('does not report an unavailable pair before the receive asset is selected', async () => {
    renderSwap({ flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })
    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: '1' }))

    expect(screen.queryByText('Swap unavailable for this pair')).not.toBeInTheDocument()
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
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromTicker: 'sats', toTicker: 'USD', feeBps: 30 })
    // fromDecimals must pair with fromTicker ('sats' -> 0), not the solver's
    // real protocol decimals (8) — otherwise the persisted receipt divides
    // the atomic sats amount by 1e8 and labels the result "sats"
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromDecimals: 0 })
  })

  it('quotes the covenant floor with the market fee conceded', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // BTC is always entered in whole sats; type 10,000 sats on the asset side
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    // 10,000 sats at $100,000/BTC is €10 — not the €1,000,000,000 a leftover
    // sats-scaled-then-multiplied-by-per-BTC-price bug would show here
    await waitFor(() => expect(screen.getByText('€10.00')).toBeInTheDocument())

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    // the review drawer's rate is quoted per whole BTC, not per satoshi
    expect(screen.getByText(/^1 BTC = /)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    const plan = createSwap.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(10_000))
    // 10_000 sats * 0.1 cents/sat * (10000 - 30)bps = 997 cents
    expect(plan.receive.atomic).toBe(BigInt(997))
    // the persisted quote snapshot must carry the same correct fiat value
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromFiatAmount: 10 })
  })

  it('types whole sats when the display unit is sats', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    const plan = createSwap.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(1_000))
    expect(plan.receive.atomic).toBe(BigInt(99))
  })

  it('quotes a sane amount when typing a fiat amount with the display unit set to sats', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // default entry mode is fiat; type "$100" without toggling to asset mode
    for (const key of ['1', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    const plan = createSwap.mock.calls[0][0]
    // $100 at $100,000/BTC = 0.001 BTC = 100,000 sats, not "0" (rounded to
    // whole BTC) and not a comma-grouped string the solver can't parse
    expect(plan.deposit.atomic).toBe(BigInt(100_000))
  })

  it('does not show a wildly inflated fiat preview for a sats amount before a receive asset is chosen', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    // switch to asset-unit entry and type a realistic sats amount (300,000 sats)
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['3', '0', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    // 300,000 sats = 0.003 BTC, worth $300 at $100,000/BTC — not $30,000,000+
    expect(screen.queryByText(/^\$3\d,\d{3},\d{3}/)).not.toBeInTheDocument()
  })

  it('shows the Bitcoin logo in the swap picker even when the display unit is sats', () => {
    const { container } = renderSwap({ config: { unit: Unit.SATS } })
    expect(container.querySelector('circle[fill="var(--orange-500)"]')).toBeInTheDocument()
  })

  it('never assigns the same React key to two occurrences of the same letter in the amount label', async () => {
    // "sats" has two 's' — a naive per-character key collapses them, which
    // React reports as a duplicate-key warning and the animated renderer
    // then smears the repeated glyph
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    // asset mode appends the ticker suffix ("1000 sats") to the amount label
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      String(call[0]).includes('Encountered two children with the same key'),
    )
    expect(duplicateKeyWarning).toBe(false)
    errorSpy.mockRestore()
  })

  it('keeps PR 784 pending-swap cancellation available', async () => {
    renderSwap({ swap: { swaps: [pendingSwap] } })
    expect(screen.getByText('BTC to USD')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(cancelSwap).toHaveBeenCalledWith('funding-txid'))
  })
})
