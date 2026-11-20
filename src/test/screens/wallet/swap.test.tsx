import userEvent from '@testing-library/user-event'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { quoteOffer, solverDirectionKey, solverId, type OfferPlan } from '@arkade-os/solver-discovery'
import { QUOTE_OPTIONS } from '@arkade-os/swap/protocol'
import type { OpenRfqOffer, Quote } from '@arkade-os/swap'
import * as solverQuoteHook from '../../../hooks/useSolverQuote'
import * as solverCards from '../../../lib/solverCards'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { ToastProvider } from '../../../components/Toast'
import { AspContext } from '../../../providers/asp'
import { AssetsContext } from '../../../providers/assets'
import { SwapsContext } from '../../../providers/swaps'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import type { WalletAssetSwap as AssetSwap } from '../../../lib/swapRepository'
import { Currencies, Unit } from '../../../lib/types'
import { saveSolverRouting } from '../../../lib/solverRouting'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'
import { btcDepix, btcUsdt, DEPIX_ID, MARAT_ID, maratNapo, USDT_ID } from '../../lib/swapFixtures'

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

// the solver's firm terms for a plan: the estimate itself unless a test lowers them
const firmQuote = (
  plan: OfferPlan,
  take = plan.receive.atomic,
  fee = (plan.receive.atomic * BigInt(plan.market.fee_bps)) / BigInt(10_000 - plan.market.fee_bps),
) =>
  ({
    id: 'firm',
    give: { asset: plan.deposit.asset.id, amount: plan.deposit.atomic },
    take: { asset: plan.receive.asset.id, amount: take },
    fee: { asset: plan.receive.asset.id, amount: fee },
    expiresAt: Math.floor(Date.now() / 1000) + 30,
  }) as unknown as Quote
const quoteExchange = vi.fn(async (plan: OfferPlan) => firmQuote(plan))
const acceptSwapQuote = vi.fn().mockResolvedValue(pendingSwap)
const cancelSwap = vi.fn().mockResolvedValue(undefined)

function renderSwap({
  flow = {},
  swap = {},
  config = {},
  fiat = {},
  wallet = {},
}: {
  flow?: Record<string, unknown>
  swap?: Record<string, unknown>
  config?: Record<string, unknown>
  fiat?: Record<string, unknown>
  wallet?: Record<string, unknown>
} = {}) {
  const navigate = vi.fn()
  const goBack = vi.fn()
  const assetMetadataCache = new Map([
    [USDT_ID, { metadata: { name: 'USDT', ticker: 'USDT', decimals: 2 } }],
    [DEPIX_ID, { metadata: { name: 'Decentralized Pix', ticker: 'DEPIX', decimals: 8 } }],
  ])
  const walletValue: Record<string, unknown> = {
    ...mockWalletContextValue,
    isVerifiedAsset: () => true,
    balance: 250_000,
    assetBalances: [
      { assetId: USDT_ID, amount: BigInt(15_000) },
      { assetId: DEPIX_ID, amount: BigInt(2_000_000_000) },
    ],
    assetMetadataCache,
    availableBalance: 100_000,
    ...wallet,
  }
  // nothing escrowed unless a test says so, so every owned unit is spendable
  if (!('availableAssetBalances' in wallet)) walletValue.availableAssetBalances = walletValue.assetBalances

  const contents = (nextSwap = swap) => (
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
                  ...fiat,
                } as any
              }
            >
              <FlowContext.Provider value={{ ...mockFlowContextValue, ...flow } as any}>
                <WalletContext.Provider value={walletValue as any}>
                  <SwapsContext.Provider
                    value={
                      {
                        markets: [btcUsdt, btcDepix],
                        discoveryReady: true,
                        swapAvailable: true,
                        swaps: [],
                        quoteExchange,
                        acceptSwapQuote,
                        cancelSwap,
                        openSwapQuotes: vi.fn().mockResolvedValue({ id: 'empty-offers', bids: [] }),
                        cancelOpenSwapQuotes: vi.fn(),
                        ...nextSwap,
                      } as any
                    }
                  >
                    <ToastProvider>
                      <WalletSwap />
                    </ToastProvider>
                  </SwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </NavigationContext.Provider>
      </AssetsContext.Provider>
    </AspContext.Provider>
  )
  const view = render(contents())
  return {
    ...view,
    goBack,
    navigate,
    rerenderSwap: (nextSwap: Record<string, unknown>) => view.rerender(contents(nextSwap)),
  }
}

// the reserve off: the BTC balance is spendable whole only while no asset is held
const NO_ASSETS = { assetBalances: [] }

const primaryAmount = () => screen.getByRole('button', { name: /^Swap amount,/ })
const secondaryAmount = () => screen.getByRole('button', { name: /^Show .+ first/ })
const openSmartRoutingReview = async (button = screen.getByRole('button', { name: 'View quotes' })) => {
  fireEvent.click(button)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Use smart routing' })).toBeEnabled(), {
    timeout: 3_000,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Use smart routing' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm swap' })).toBeEnabled())
}

describe('Wallet swap flow', () => {
  afterEach(() => vi.useRealTimers())

  beforeEach(() => {
    quoteExchange.mockReset().mockImplementation(async (plan: OfferPlan) => firmQuote(plan))
    acceptSwapQuote.mockReset().mockResolvedValue(pendingSwap)
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

  it('lists an asset once when a pinned card names it by its CAIP-19 id', () => {
    const pinned = {
      ...btcUsdt,
      solver: 'ln-solver',
      base_asset: { id: 'arkade:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: {
        id: `arkade:mutinynet/asset:${USDT_ID}`,
        name: 'Arkade asset f121ac9b',
        ticker: 'f121ac9b',
        decimals: 2,
      },
    }
    renderSwap({ swap: { markets: [btcUsdt, pinned] } })

    expect(screen.getAllByText('USD')).toHaveLength(1)
    expect(screen.queryByText(/f121ac9b/)).not.toBeInTheDocument()
  })

  it('keeps the BRL identity and flag after spending the full DePix balance', () => {
    renderSwap({
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: { assetBalances: [{ assetId: USDT_ID, amount: BigInt(15_000) }] },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))

    expect(screen.getByText('BRL')).toBeInTheDocument()
    expect(screen.queryByText(/DePix|DEPIX/)).not.toBeInTheDocument()
    // The flag's clip path id is unique per instance, so it is matched by
    // prefix rather than by the literal id.
    expect(document.querySelector('clipPath[id^="br-flag-circle"]')).not.toBeNull()
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

    expect(screen.getByLabelText(/^Swap amount,/)).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.queryByText('Choose asset to swap')).not.toBeInTheDocument()
    expect(setSwapFromAssetId).toHaveBeenCalledWith(undefined)
  })

  it('does not report an unavailable pair before the receive asset is selected', async () => {
    renderSwap({ flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })
    expect(screen.getByLabelText(/^Swap amount,/)).toBeInTheDocument()
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: '1' }))

    expect(screen.queryByText('Swap unavailable for this pair')).not.toBeInTheDocument()
  })

  it('does not autofocus asset search after opening the receive drawer with a pointer', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))

    const searchInput = screen.getByPlaceholderText('Search assets')
    await waitFor(() => expect(searchInput).not.toHaveFocus())
  })

  it('swaps in asset units without currency prices in either direction', async () => {
    const unavailableCurrency = {
      toFiat: () => 0,
      fromFiat: () => 0,
      fromFiatAmount: () => 0,
      toFiatAmount: () => 0,
    }
    const common = {
      config: { currency: Currencies.USD, unit: Unit.SATS },
      fiat: unavailableCurrency,
    }

    const first = renderSwap({
      ...common,
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /BRL/i }))
    expect(screen.queryByRole('button', { name: /^Show .+ first/ })).not.toBeInTheDocument()
    for (const key of ['1', '0', '0', '0']) await userEvent.click(screen.getByRole('button', { name: key }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'View quotes' })).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview()
    expect(document.body).not.toHaveTextContent(/[$€]/)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][1]).not.toHaveProperty('fromFiatAmount')

    first.unmount()
    quoteExchange.mockClear()
    acceptSwapQuote.mockClear()

    renderSwap({
      ...common,
      flow: { swapFromAssetId: DEPIX_ID, setSwapFromAssetId: vi.fn() },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    expect(screen.queryByRole('button', { name: /^Show .+ first/ })).not.toBeInTheDocument()
    for (const key of ['1', '0']) await userEvent.click(screen.getByRole('button', { name: key }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'View quotes' })).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview()
    expect(document.body).not.toHaveTextContent(/[$€]/)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][1]).not.toHaveProperty('fromFiatAmount')
  })

  const reviewSatsToBrl = async () => {
    const view = renderSwap({
      config: { currency: Currencies.USD, unit: Unit.SATS },
      fiat: { toFiat: () => 0, fromFiat: () => 0, fromFiatAmount: () => 0, toFiatAmount: () => 0 },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /BRL/i }))
    for (const key of ['1', '0', '0', '0']) await userEvent.click(screen.getByRole('button', { name: key }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'View quotes' })).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview()
    return view
  }
  const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

  it('confirms a live firm quote while the estimate is unavailable', async () => {
    quoteExchange.mockImplementationOnce(async (plan: OfferPlan) => firmQuote(plan, plan.receive.atomic - 1n))
    const view = await reviewSatsToBrl()
    await waitFor(() => expect(screen.getByText(/lower than the estimate/)).toBeInTheDocument())

    // the market the estimate came from is gone; the firm quote it produced is not
    view.rerenderSwap({ markets: [btcUsdt] })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm swap' })).toBeEnabled())
    confirm()

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange).toHaveBeenCalledOnce()
  })

  it('quotes firmly as the review opens and funds that quote on one confirm', async () => {
    quoteExchange.mockImplementationOnce(async (plan: OfferPlan) => firmQuote(plan, plan.receive.atomic - 1n))
    await reviewSatsToBrl()

    await waitFor(() => expect(screen.getByText(/lower than the estimate/)).toBeInTheDocument())
    expect(acceptSwapQuote).not.toHaveBeenCalled()

    confirm()
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    const plan = quoteExchange.mock.calls[0][0]
    expect(acceptSwapQuote.mock.calls[0][0].take.amount).toBe(plan.receive.atomic - 1n)
    expect(quoteExchange).toHaveBeenCalledOnce()
  })

  it('funds the same firm quote on a retry instead of asking for its terms again', async () => {
    acceptSwapQuote.mockRejectedValueOnce(new Error('network down'))
    await reviewSatsToBrl()

    confirm()
    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
    confirm()

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledTimes(2))
    expect(acceptSwapQuote.mock.calls[1][0]).toBe(acceptSwapQuote.mock.calls[0][0])
    expect(quoteExchange).toHaveBeenCalledOnce()
  })

  it('quotes again on reopen when the driver no longer holds the firm quote', async () => {
    const lost = Object.assign(new Error('This quote is no longer available — refresh to try again'), {
      name: 'QuoteUnavailable',
    })
    acceptSwapQuote.mockRejectedValueOnce(lost)
    await reviewSatsToBrl()

    confirm()
    await waitFor(() => expect(screen.getByText(/no longer available/)).toBeInTheDocument())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm swap' })).not.toBeInTheDocument())
    await openSmartRoutingReview()
    confirm()

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledTimes(2))
    expect(quoteExchange).toHaveBeenCalledTimes(2)
    expect(acceptSwapQuote.mock.calls[1][0]).not.toBe(acceptSwapQuote.mock.calls[0][0])
  })

  it('keeps a firm quote below the estimate when the review is reopened', async () => {
    quoteExchange.mockImplementationOnce(async (plan: OfferPlan) => firmQuote(plan, plan.receive.atomic - 1n))
    await reviewSatsToBrl()
    await waitFor(() => expect(screen.getByText(/lower than the estimate/)).toBeInTheDocument())

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm swap' })).not.toBeInTheDocument())
    await openSmartRoutingReview()
    confirm()

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange).toHaveBeenCalledOnce()
  })

  it('quotes again at confirm after the review quote fails, and never funds below the estimate', async () => {
    quoteExchange
      .mockImplementationOnce(async () => {
        throw new Error('solver busy')
      })
      .mockImplementationOnce(async (plan: OfferPlan) => firmQuote(plan, plan.receive.atomic - 1n))
    await reviewSatsToBrl()
    await waitFor(() => expect(screen.getByText('solver busy')).toBeInTheDocument())

    confirm()
    await waitFor(() => expect(screen.getByText(/lower than the estimate/)).toBeInTheDocument())
    expect(quoteExchange).toHaveBeenCalledTimes(2)
    expect(acceptSwapQuote).not.toHaveBeenCalled()
  })

  it('funds a lapsed firm quote re-quoted on the terms shown in one confirm', async () => {
    quoteExchange
      .mockImplementationOnce(
        async (plan: OfferPlan) => ({ ...firmQuote(plan, plan.receive.atomic - 1n), expiresAt: 0 }) as Quote,
      )
      .mockImplementationOnce(async (plan: OfferPlan) => firmQuote(plan, plan.receive.atomic - 1n))
    await reviewSatsToBrl()
    await waitFor(() => expect(screen.getByText(/lower than the estimate/)).toBeInTheDocument())

    confirm()
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange).toHaveBeenCalledTimes(2)
    expect(acceptSwapQuote.mock.calls[0][0].expiresAt).toBeGreaterThan(0)
  })

  it('keeps the priced receive conversion when only the give asset is unpriced', async () => {
    renderSwap({
      flow: { swapFromAssetId: DEPIX_ID, setSwapFromAssetId: vi.fn() },
      wallet: { isVerifiedAsset: (assetId: string) => assetId !== DEPIX_ID },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    expect(screen.queryByRole('button', { name: /^Show .+ first/ })).not.toBeInTheDocument()
    for (const key of ['1', '0']) await userEvent.click(screen.getByRole('button', { name: key }))

    const receiveCard = screen.getByRole('button', { name: /Receive BTC/i })
    await waitFor(() => expect(receiveCard).toHaveTextContent('€'), { timeout: 3_000 })
    expect(primaryAmount()).toHaveTextContent('10 DEPIX')

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][1]).not.toHaveProperty('fromFiatAmount')
  })

  it('hides identity conversion for a BTC-currency sats swap and preserves the exact amount', async () => {
    renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })

    expect(screen.queryByRole('button', { name: /^Show .+ first/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    for (const key of ['1', '0', '0', '0']) await userEvent.click(screen.getByRole('button', { name: key }))

    expect(primaryAmount()).toHaveAccessibleName('Swap amount, 1000 sats')
    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(1_000))
  })

  it('hides identity conversion for a BRL-currency BRL swap and preserves the exact amount', async () => {
    renderSwap({
      config: { currency: Currencies.BRL, unit: Unit.SATS },
      flow: { swapFromAssetId: DEPIX_ID, setSwapFromAssetId: vi.fn() },
      wallet: { assetBalances: [{ assetId: DEPIX_ID, amount: BigInt(200_000_000_000) }] },
    })

    expect(screen.queryByRole('button', { name: /^Show .+ first/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    for (const key of ['1', '0', '0', '0']) await userEvent.click(screen.getByRole('button', { name: key }))

    expect(primaryAmount()).toHaveAccessibleName('Swap amount, 1000 BRL')
    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(100_000_000_000))
  })

  it('clears a currency amount when its price conversion becomes unavailable', async () => {
    let priceAvailable = true
    renderSwap({
      config: { currency: Currencies.USD, unit: Unit.SATS },
      fiat: {
        fromFiatAmount: (amount: number) => (priceAvailable ? amount : 0),
        toFiatAmount: (amount: number) => (priceAvailable ? amount : 0),
      },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    for (const key of ['1', '0']) await userEvent.click(screen.getByRole('button', { name: key }))
    expect(primaryAmount()).toHaveAccessibleName('Swap amount, $10')

    priceAvailable = false
    await userEvent.click(screen.getByRole('button', { name: '0' }))

    await waitFor(() => expect(primaryAmount()).toHaveAccessibleName('Swap amount, 0 sats'))
    expect(screen.queryByRole('button', { name: /^Show .+ first/ })).not.toBeInTheDocument()
  })

  it('replaces the available balance with a max action for insufficient balance', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() }, wallet: NO_ASSETS })

    for (const key of ['9', '9', '9']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    expect(primaryAmount().className).toContain('swap-amount-display--invalid')

    const useMaxButton = await screen.findByRole('button', { name: /^Use maximum/ })
    expect(useMaxButton).toHaveAccessibleName('Use maximum 0.00100000 BTC')
    expect(secondaryAmount()).toBeInTheDocument()
    await userEvent.click(useMaxButton)

    await waitFor(() => expect(primaryAmount()).toHaveTextContent('0.001 BTC'))
    await waitFor(() => expect(primaryAmount().className).not.toContain('swap-amount-display--invalid'))
  })

  it('keeps non-limit validation errors in Sonner', async () => {
    fetchMocker.mockRejectOnce(new Error('feed unavailable'))
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() }, wallet: NO_ASSETS })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: '5' }))

    await waitFor(() => expect(screen.getByText('Quote unavailable')).toBeInTheDocument(), { timeout: 3_000 })
    expect(screen.getByText('Quote unavailable').closest('[data-sonner-toast]')).not.toBeNull()
    expect(screen.getByRole('button', { name: '0.00100000 BTC' })).toBeInTheDocument()
  })

  it('shows a paused direction as unavailable and quotes again when a solver is enabled', async () => {
    const alternate = { ...btcUsdt, source: 'alternate' }
    const direction = solverDirectionKey(btcUsdt, 'base', 'mutinynet')
    saveSolverRouting('mutinynet', direction, {
      disabled: [btcUsdt, alternate].map((market) => solverId(market, 'mutinynet')),
    })
    const view = renderSwap({
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: NO_ASSETS,
      swap: { markets: [btcUsdt, alternate, btcDepix] },
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      await userEvent.click(screen.getByRole('button', { name: '5' }))

      expect(await screen.findByText('Swap unavailable for this pair')).toBeInTheDocument()
      expect(screen.queryByText('Quote unavailable')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Refresh offers' })).toBeEnabled()
      expect(quoteExchange).not.toHaveBeenCalled()

      act(() => saveSolverRouting('mutinynet', direction, { disabled: [solverId(btcUsdt, 'mutinynet')] }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Use smart routing' })).toBeEnabled())
    } finally {
      view.unmount()
      saveSolverRouting('mutinynet', direction, {})
    }
  })

  it('stops a partial asset swap that cannot fund its change carrier', async () => {
    renderSwap({
      config: { currency: Currencies.BRL, unit: Unit.SATS },
      flow: { swapFromAssetId: DEPIX_ID, setSwapFromAssetId: vi.fn() },
      // one dust carrier: the sats the DEPIX itself rides on
      wallet: { availableBalance: 333, assetBalances: [{ assetId: DEPIX_ID, amount: BigInt(200_000_000_000) }] },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    // one key and one lookup: the toast lives 2s, and a slow runner spends
    // that typing more digits or querying twice
    await userEvent.click(screen.getByRole('button', { name: '1' }))

    const notice = await screen.findByText(/partial swap/, {}, { timeout: 3_000 })
    expect(notice.closest('[data-sonner-toast]')).not.toBeNull()
    expect(primaryAmount().className).toContain('swap-amount-display--invalid')
    expect(screen.getByRole('button', { name: 'View quotes' })).toBeDisabled()
  })

  it('allows a partial asset swap once a second dust carrier is available', async () => {
    renderSwap({
      config: { currency: Currencies.BRL, unit: Unit.SATS },
      flow: { swapFromAssetId: DEPIX_ID, setSwapFromAssetId: vi.fn() },
      wallet: { availableBalance: 666, assetBalances: [{ assetId: DEPIX_ID, amount: BigInt(200_000_000_000) }] },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    for (const key of ['1', '0', '0', '0']) await userEvent.click(screen.getByRole('button', { name: key }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'View quotes' })).toBeEnabled(), { timeout: 3_000 })
    expect(screen.queryByText(/partial swap/)).not.toBeInTheDocument()
  })

  it.each([false, true])(
    'waits for settled discovery before deciding whether to search (saved route=%s)',
    async (supported) => {
      const openSwapQuotes = vi.fn().mockResolvedValue({ id: 'after-discovery', bids: [] })
      const initial = {
        markets: [],
        allMarkets: [],
        discoveryReady: false,
        openSwapQuotes,
        cancelOpenSwapQuotes: vi.fn(),
      }
      const view = renderSwap({
        config: { currency: Currencies.BTC, unit: Unit.SATS },
        flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
        wallet: NO_ASSETS,
        swap: initial,
      })
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      expect(openSwapQuotes).not.toHaveBeenCalled()
      view.rerenderSwap({
        ...initial,
        markets: supported ? [btcUsdt] : [],
        allMarkets: supported ? [btcUsdt] : [],
        discoveryReady: true,
      })
      if (supported) {
        await waitFor(() => expect(screen.getByRole('button', { name: 'Use smart routing' })).toBeEnabled())
        expect(openSwapQuotes).not.toHaveBeenCalled()
      } else await waitFor(() => expect(openSwapQuotes).toHaveBeenCalledOnce())
    },
  )

  it.each([false, true])(
    'uses automatic amount fallback only for feed-based saved solvers (negotiated=%s)',
    async (negotiated) => {
      const openSwapQuotes = vi.fn().mockResolvedValue({ id: 'amount-excluded', bids: [] })
      const market = {
        ...btcUsdt,
        max_base_amount: '5000',
        ...(negotiated
          ? { discovery_pubkey: 'ab'.repeat(32), transports: { nostr: { relays: ['wss://solver.test'] } } }
          : {}),
      }
      renderSwap({
        config: { currency: Currencies.BTC, unit: Unit.SATS },
        flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
        wallet: NO_ASSETS,
        swap: { markets: [market], openSwapQuotes },
      })
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      expect(openSwapQuotes).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      if (negotiated) {
        await screen.findByText(/^Maximum /)
        expect(openSwapQuotes).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'Find open offers' })).toBeEnabled()
      } else await waitFor(() => expect(openSwapQuotes).toHaveBeenCalledOnce(), { timeout: 3_000 })
      expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
      expect(quoteExchange).not.toHaveBeenCalled()
    },
  )

  it('keeps a saved route private when its quote fails transiently', async () => {
    const openSwapQuotes = vi.fn()
    const hook = vi.spyOn(solverQuoteHook, 'useSolverQuote').mockReturnValue({
      plan: null,
      status: 'error',
      solvable: undefined,
      setGiveAmount: vi.fn(),
    })
    const view = renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: NO_ASSETS,
      swap: { openSwapQuotes },
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      await act(async () => {})
      expect(openSwapQuotes).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Find open offers' })).toBeEnabled()
    } finally {
      view.unmount()
      hook.mockRestore()
    }
  })

  it('finds open offers for a held token with no known solver market', async () => {
    const openSwapQuotes = vi.fn().mockResolvedValue({ id: 'unknown-token-auction', bids: [] })
    renderSwap({
      flow: { swapFromAssetId: MARAT_ID, setSwapFromAssetId: vi.fn() },
      wallet: {
        assetBalances: [{ assetId: MARAT_ID, amount: 10_000n }],
        assetMetadataCache: new Map([[MARAT_ID, { metadata: { name: 'JP Marat', ticker: 'MARAT', decimals: 2 } }]]),
      },
      swap: { markets: [], allMarkets: [], swapAvailable: true, openSwapQuotes, cancelOpenSwapQuotes: vi.fn() },
    })
    expect(screen.getByText('JP Marat')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(openSwapQuotes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Refresh offers' })).toBeEnabled()
    await waitFor(() =>
      expect(openSwapQuotes).toHaveBeenCalledWith(MARAT_ID, 'btc', 100n, expect.any(String), undefined),
    )
    expect(quoteExchange).not.toHaveBeenCalled()
  })

  it('previews the next solver when the first card disagrees with authoritative source precision', async () => {
    const bad = { ...btcUsdt, source: 'precision-bad', quote_asset: { ...btcUsdt.quote_asset, decimals: 3 } }
    const good = { ...btcUsdt, source: 'precision-good' }
    renderSwap({
      flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() },
      swap: { markets: [bad, good] },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    for (const key of ['1', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
    await openSmartRoutingReview()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect((quoteExchange.mock.calls[0][0].market as { source?: string }).source).toBe('precision-good')
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(1_000n)
  })

  it('refuses target precision disagreement even when the source atomic amount matches', async () => {
    const plan = await quoteOffer(btcUsdt, { give: 'base', giveAmount: '0.0001', ...QUOTE_OPTIONS })
    expect(plan.deposit.atomic).toBe(10_000n)
    expect(plan.receive.atomic).toBe(997n)
    expect(plan.receive.asset.decimals).toBe(2)
    const hook = vi.spyOn(solverQuoteHook, 'useSolverQuote').mockReturnValue({
      plan,
      status: 'success',
      solvable: true,
      setGiveAmount: vi.fn(),
    })
    const view = renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: {
        ...NO_ASSETS,
        assetMetadataCache: new Map([[USDT_ID, { metadata: { name: 'USDT', ticker: 'USDT', decimals: 6 } }]]),
      },
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Refresh offers' })).toBeEnabled()
      expect(quoteExchange).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      hook.mockRestore()
    }
  })

  it('refuses a known plan whose atomic deposit differs from the wallet amount scale', async () => {
    const market = { ...btcUsdt, quote_asset: { ...btcUsdt.quote_asset, decimals: 3 } }
    const plan = await quoteOffer(market, { give: 'quote', giveAmount: '10', ...QUOTE_OPTIONS })
    expect(plan.deposit.atomic).toBe(10_000n)
    const hook = vi.spyOn(solverQuoteHook, 'useSolverQuote').mockReturnValue({
      plan,
      status: 'success',
      solvable: true,
      setGiveAmount: vi.fn(),
    })
    const view = renderSwap({ flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
      for (const key of ['1', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Find open offers' })).toBeEnabled()
      expect(quoteExchange).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      hook.mockRestore()
    }
  })

  it('finds offers to receive a cached unheld token without any known markets', async () => {
    const openSwapQuotes = vi.fn().mockResolvedValue({ id: 'cached-token-auction', bids: [] })
    renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: {
        ...NO_ASSETS,
        assetMetadataCache: new Map([
          [USDT_ID, { metadata: { name: 'USDT', ticker: 'USDT', decimals: 2 } }],
          ['ab'.repeat(34), { metadata: { name: 'Bad precision', ticker: 'BAD', decimals: 37 } }],
          ['not-an-asset', { metadata: { name: 'Bad identifier', ticker: 'BADID', decimals: 2 } }],
        ]),
      },
      swap: { markets: [], allMarkets: [], swapAvailable: true, openSwapQuotes, cancelOpenSwapQuotes: vi.fn() },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    expect(screen.queryByText('Bad precision')).not.toBeInTheDocument()
    expect(screen.queryByText('Bad identifier')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    expect(screen.getByRole('button', { name: 'Switch swap direction' })).toBeDisabled()
    for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(openSwapQuotes).toHaveBeenCalledWith('btc', USDT_ID, 10_000n, expect.any(String), undefined),
    )
    expect(quoteExchange).not.toHaveBeenCalled()
  })

  it('does not list cached unheld tokens as sources without a market or balance', () => {
    renderSwap({ wallet: NO_ASSETS, swap: { markets: [], allMarkets: [], swapAvailable: true } })
    expect(screen.getByText('Choose asset to swap')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bitcoin/i })).toBeInTheDocument()
    expect(screen.queryByText('USD')).not.toBeInTheDocument()
    expect(screen.queryByText('BRL')).not.toBeInTheDocument()
  })

  it('does not expose an unsupported token-to-onchain route from an advertised market', () => {
    const advertised = {
      ...btcUsdt,
      pair: 'MARAT/onchain:BTC',
      base_asset: { id: `arkade:mutinynet/asset:${MARAT_ID}`, name: 'JP Marat', ticker: 'MARAT', decimals: 2 },
      quote_asset: { id: 'bitcoin:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      discovery_pubkey: 'cd'.repeat(32),
      solver: 'unsupported asset payout',
    }
    renderSwap({
      flow: { swapFromAssetId: MARAT_ID, setSwapFromAssetId: vi.fn() },
      wallet: {
        assetBalances: [{ assetId: MARAT_ID, amount: 10_000n }],
        assetMetadataCache: new Map([[MARAT_ID, { metadata: { name: 'JP Marat', ticker: 'MARAT', decimals: 2 } }]]),
      },
      swap: { markets: [], allMarkets: [advertised], swapAvailable: true },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    expect(screen.queryByRole('button', { name: /Bitcoin onchain/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bitcoin/i })).toBeInTheDocument()
  })

  it.each(['none', 'unaddressable', 'addressable'] as const)(
    'discovers onchain Bitcoin offers with saved routing=%s and keeps the destination private',
    async (knownMarkets) => {
      const listed = knownMarkets !== 'none'
      const addressable = knownMarkets === 'addressable'
      const onchain = {
        ...btcUsdt,
        pair: 'BTC/onchain:BTC',
        base_asset: { id: 'arkade:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
        quote_asset: { id: 'bitcoin:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
        ...(addressable
          ? { discovery_pubkey: 'ab'.repeat(32), transports: { nostr: { relays: ['wss://solver.test'] } } }
          : {}),
      }
      const openSwapQuotes = vi.fn().mockResolvedValue({ id: 'onchain-auction', bids: [] })
      renderSwap({
        config: { currency: Currencies.BTC, unit: Unit.SATS },
        flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
        wallet: NO_ASSETS,
        swap: {
          markets: listed ? [btcUsdt, btcDepix] : [],
          allMarkets: listed ? [btcUsdt, onchain] : [],
          swapAvailable: true,
          openSwapQuotes,
          cancelOpenSwapQuotes: vi.fn(),
        },
      })
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /Bitcoin onchain/i }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      expect(screen.getByRole('button', { name: 'View quotes' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Switch swap direction' })).toBeDisabled()
      fireEvent.change(screen.getByRole('textbox', { name: 'Bitcoin address (mutinynet)' }), {
        target: { value: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
      })
      expect(screen.getByRole('button', { name: 'View quotes' })).toBeDisabled()
      fireEvent.change(screen.getByRole('textbox', { name: 'Bitcoin address (mutinynet)' }), {
        target: { value: 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
      expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
      if (addressable) {
        expect(openSwapQuotes).not.toHaveBeenCalled()
        fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
      }
      await waitFor(() =>
        expect(openSwapQuotes).toHaveBeenCalledWith(
          'btc',
          'bitcoin:mutinynet/slip44:1',
          10_000n,
          expect.any(String),
          'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn',
        ),
      )
      expect(openSwapQuotes).toHaveBeenCalledOnce()
      expect(quoteExchange).not.toHaveBeenCalled()
    },
  )

  it.each([false, true])('reviews the immutable onchain recipient and refuses a mismatch (%s)', async (mismatch) => {
    const recipient = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'
    const onchain = {
      ...btcUsdt,
      pair: 'BTC/onchain:BTC',
      base_asset: { id: 'arkade:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      quote_asset: { id: 'bitcoin:mutinynet/slip44:1', name: 'Bitcoin', ticker: 'BTC', decimals: 8 },
      discovery_pubkey: 'ab'.repeat(32),
      transports: { nostr: { relays: ['wss://solver.test'] } },
    }
    const expiresAt = Math.floor(Date.now() / 1000) + 60
    const verified: Quote = {
      id: 'onchain-quote',
      give: { asset: 'arkade:mutinynet/slip44:1', amount: 10_000n },
      take: { asset: 'bitcoin:mutinynet/slip44:1', amount: 9_970n },
      fee: { asset: 'arkade:mutinynet/slip44:1', amount: 30n },
      route: {
        give: { corridor: 'arkade', asset: 'arkade:mutinynet/slip44:1', instrument: { kind: 'wallet' } },
        take: {
          corridor: 'onchain',
          asset: 'bitcoin:mutinynet/slip44:1',
          instrument: { kind: 'address', address: mismatch ? '2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc' : recipient },
        },
      },
      market: {
        kind: 'card',
        key: 'arkade:mutinynet/slip44:1/bitcoin:mutinynet/slip44:1',
        backend: 'rfq',
        source: 'local:onchain-solver',
        sourceType: 'local',
        solver: 'Onchain solver',
        pair: onchain.pair,
        snapshot: { fetchedAt: Date.now(), live: true, source: 'injected' },
      },
      expiresAt,
    }
    const bid = {
      id: 'bid',
      solverName: 'Onchain solver',
      solverPubkey: 'ab'.repeat(32),
      fromAmount: 10_000n,
      toAmount: 9_970n,
      expiresAt,
      market: onchain,
      signedCard: {},
    } as OpenRfqOffer
    const acceptSwapQuote = vi.fn().mockResolvedValue(pendingSwap)
    renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: NO_ASSETS,
      swap: {
        markets: [],
        allMarkets: [onchain],
        swapAvailable: true,
        openSwapQuotes: vi.fn().mockResolvedValue({ id: 'auction', bids: [bid] }),
        cancelOpenSwapQuotes: vi.fn(),
        chooseSwapQuote: vi.fn().mockResolvedValue(verified),
        acceptSwapQuote,
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin onchain/i }))
    for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Bitcoin address (mutinynet)' }), {
      target: { value: recipient },
    })
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select Onchain solver' }))
    if (mismatch) {
      expect(
        await screen.findByText('The verified quote has a different recipient. Choose another offer.'),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Confirm swap' })).not.toBeInTheDocument()
      expect(acceptSwapQuote).not.toHaveBeenCalled()
    } else {
      expect(await screen.findByText(recipient)).toBeInTheDocument()
      expect(screen.getByText('Receive before Bitcoin network fee')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
      await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledWith(verified, expect.any(Object)))
    }
  })

  const openOffers = () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 60
    const bids = ['first', 'second'].map((id, index) => ({
      id,
      solverPubkey: (index ? 'bb' : 'aa').repeat(32),
      solverName: `${id} solver`,
      market: btcUsdt,
      fromAmount: 10_000n,
      toAmount: BigInt(1_002 - index),
      expiresAt,
      signedCard: {},
    })) as OpenRfqOffer[]
    const verified: Quote = {
      id: 'selected-quote',
      give: { asset: 'arkade:mutinynet/slip44:1', amount: 10_000n },
      take: { asset: `arkade:mutinynet/asset:${USDT_ID}`, amount: 1_001n },
      fee: { asset: 'arkade:mutinynet/slip44:1', amount: 30n },
      route: {
        give: { corridor: 'arkade', asset: 'arkade:mutinynet/slip44:1', instrument: { kind: 'wallet' } },
        take: { corridor: 'arkade', asset: `arkade:mutinynet/asset:${USDT_ID}`, instrument: { kind: 'wallet' } },
      },
      market: {
        kind: 'card',
        key: `arkade:btc/arkade:${USDT_ID}`,
        backend: 'feed',
        source: 'local:second-solver',
        sourceType: 'local',
        solver: 'second solver',
        pair: btcUsdt.pair ?? 'BTC/USDT',
        snapshot: { fetchedAt: Date.now(), live: true, source: 'injected' },
      },
      expiresAt,
    }
    return {
      verified,
      openSwapQuotes: vi.fn().mockResolvedValue({ id: 'auction', bids }),
      chooseSwapQuote: vi.fn().mockResolvedValue(verified),
      cancelOpenSwapQuotes: vi.fn(),
    }
  }

  it('keeps a chosen open offer when an earlier firm quote lands after it', async () => {
    const { verified, ...offers } = openOffers()
    let landFirm!: () => void
    quoteExchange.mockImplementationOnce(
      (plan: OfferPlan) => new Promise<Quote>((resolve) => (landFirm = () => resolve(firmQuote(plan)))),
    )
    renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      swap: offers,
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Use smart routing' })).toBeEnabled(), {
      timeout: 3_000,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Use smart routing' }))
    await waitFor(() => expect(quoteExchange).toHaveBeenCalledOnce())

    await userEvent.keyboard('{Escape}')
    fireEvent.click(await screen.findByRole('button', { name: 'View quotes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select second solver' }))
    expect(await screen.findByText('Provider')).toBeInTheDocument()
    await act(async () => landFirm())

    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm swap' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][0]).toBe(verified)
  })

  it('reviews and accepts the explicitly selected open offer without using automatic exchange', async () => {
    const { verified, openSwapQuotes, chooseSwapQuote } = openOffers()
    let completeAcceptance!: (value: typeof pendingSwap) => void
    const acceptSwapQuote = vi.fn().mockReturnValue(
      new Promise<typeof pendingSwap>((resolve) => {
        completeAcceptance = resolve
      }),
    )
    const saveCard = vi.spyOn(solverCards, 'saveSolverCards').mockImplementation(() => undefined)
    renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: NO_ASSETS,
      swap: { openSwapQuotes, chooseSwapQuote, acceptSwapQuote, cancelOpenSwapQuotes: vi.fn() },
    })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    expect(openSwapQuotes).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Find open offers' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Select second solver' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm swap' })).toBeEnabled())
    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByText('10.01 USD')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Save solver after this swap' }))
    expect(saveCard).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledWith(verified, expect.any(Object)))
    expect(saveCard).not.toHaveBeenCalled()
    await act(async () => completeAcceptance(pendingSwap))
    await waitFor(() =>
      expect(saveCard).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ label: 'second solver' })]),
      ),
    )
    expect(chooseSwapQuote).toHaveBeenCalledWith('auction', 'second')
    expect(quoteExchange).not.toHaveBeenCalled()
    saveCard.mockRestore()
  })

  it('submits the live PR 784 offer plan and a historical display snapshot', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: '0' }))

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(50_000))
    // the default display unit is BTC (mockConfigContextValue) — the swap
    // entry/ticker/decimals follow it, same as the rest of the wallet
    expect(acceptSwapQuote.mock.calls[0][1]).toMatchObject({ fromTicker: 'BTC', toTicker: 'USD', feeBps: 30 })
    // fromDecimals must pair with fromTicker ('BTC' -> 8), the solver's real
    // protocol decimals — otherwise the persisted receipt mislabels the scale
    expect(acceptSwapQuote.mock.calls[0][1]).toMatchObject({ fromDecimals: 8 })
  })

  it('quotes the covenant floor with the market fee conceded', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // display unit is sats; type 10,000 sats on the asset side
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    // 10,000 sats at $100,000/BTC is €10 — not the €1,000,000,000 a leftover
    // sats-scaled-then-multiplied-by-per-BTC-price bug would show here
    await waitFor(() => expect(screen.getByText('€10.00')).toBeInTheDocument())

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    expect(screen.getByRole('heading', { name: 'BTC to USD' })).toBeInTheDocument()
    // the review drawer's rate is quoted per whole BTC, not per satoshi, and
    // shows the feed's pre-fee price — the fee is itemized on its own row, so
    // the rate must read $100,000 (the feed), not the net 99,700 that baking
    // the fee in would show
    expect(screen.getByText('1 BTC = 100,000 USD')).toBeInTheDocument()
    // the fee is shown in the receive asset (USD), not the wallet's display
    // currency — 9.97 received net of a 0.30% fee means a 0.03 USD fee
    expect(screen.getByText('0.03 USD')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(screen.getByText('BTC to USD · Waiting for fill')).toBeInTheDocument()
    const plan = quoteExchange.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(10_000))
    // 10_000 sats * 0.1 cents/sat * (10000 - 30)bps = 997 cents
    expect(plan.receive.atomic).toBe(BigInt(997))
    // the persisted quote snapshot must carry the same correct fiat value
    expect(acceptSwapQuote.mock.calls[0][1]).toMatchObject({ fromFiatAmount: 10 })
  })

  it('shows a firm quote below the estimate at the market rate, with its own fee and amount', async () => {
    // a 21-cent delivered carrier the estimate did not price: the 3-cent spread becomes a 24-cent fee
    quoteExchange.mockImplementationOnce(async (plan: OfferPlan) => firmQuote(plan, plan.receive.atomic - 21n, 24n))
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) await userEvent.click(screen.getByRole('button', { name: key }))
    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)

    expect(screen.getByText(/lower than the estimate/)).toBeInTheDocument()
    expect(screen.getByText('9.76 USD')).toBeInTheDocument()
    expect(screen.getByText('1 BTC = 100,000 USD')).toBeInTheDocument()
    expect(screen.getByText('0.24 USD')).toBeInTheDocument()
  })

  it.each(['pair', 'orientation'])('refuses a hook plan with a mismatched %s at confirmation', async (mismatch) => {
    const market =
      mismatch === 'pair'
        ? {
            ...btcUsdt,
            pair: btcDepix.pair,
            quote_asset: {
              ...btcUsdt.quote_asset,
              id: DEPIX_ID,
              name: btcDepix.quote_asset.name,
              ticker: btcDepix.quote_asset.ticker,
            },
          }
        : btcUsdt
    const plan = await quoteOffer(market, {
      give: 'base',
      giveAmount: '0.0001',
      ...QUOTE_OPTIONS,
    })
    if (mismatch === 'pair') {
      expect(plan.receive.asset.id).toBe(DEPIX_ID)
      expect(plan.receive.asset.decimals).toBe(btcUsdt.quote_asset.decimals)
    }
    if (mismatch === 'orientation') plan.give = 'quote'
    const hook = vi.spyOn(solverQuoteHook, 'useSolverQuote').mockReturnValue({
      plan,
      status: 'success',
      solvable: undefined,
      setGiveAmount: vi.fn(),
    })
    const view = renderSwap({
      config: { unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      fireEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      const continueButton = screen.getByRole('button', { name: 'View quotes' })
      expect(continueButton).toBeEnabled()
      await openSmartRoutingReview(continueButton)
      fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
      expect(quoteExchange).not.toHaveBeenCalled()
      expect(screen.getByText('Quote unavailable')).toBeInTheDocument()
    } finally {
      view.unmount()
      hook.mockRestore()
    }
  })

  it('accepts a valid alternate solver market for the current pair and orientation', async () => {
    const alternate = { ...btcUsdt, solver: 'alternate', source: 'alternate', fee_bps: 20 }
    const plan = await quoteOffer(alternate, { give: 'base', giveAmount: '0.0001', ...QUOTE_OPTIONS })
    const hook = vi.spyOn(solverQuoteHook, 'useSolverQuote').mockReturnValue({
      plan,
      status: 'success',
      solvable: undefined,
      setGiveAmount: vi.fn(),
    })
    const view = renderSwap({
      config: { unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      swap: { markets: [btcUsdt, alternate] },
    })
    try {
      fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
      fireEvent.click(screen.getByRole('button', { name: /USD/i }))
      fireEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
      for (const key of ['1', '0', '0', '0', '0']) fireEvent.click(screen.getByRole('button', { name: key }))
      await openSmartRoutingReview()
      fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
      await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
      expect(quoteExchange.mock.calls[0][0].market).toEqual(alternate)
      expect(quoteExchange.mock.calls[0][0]).toBe(plan)
    } finally {
      view.unmount()
      hook.mockRestore()
    }
  })

  it('never shows a fractional sats fee — sats and ₿ are whole numbers', async () => {
    // a non-round BTC price so the give amount doesn't land on a whole-sat fee
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 63_000 }, price: '500000' }))
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    // type 100 USD on the asset side → a six-figure sats payout whose derived
    // fee is fractional before rounding to the sats asset's 0 decimals
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)

    // the review drawer's Swap/Receive/Fees are all in sats — none may carry a
    // fractional part ("532.333 sats" is not a representable amount)
    expect(screen.getByText('Confirm swap')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'USD to BTC' })).toBeInTheDocument()
    expect(screen.queryByText(/\d\.\d+ sats/)).not.toBeInTheDocument()
    // giving the quote side inverts the pre-fee feed price: 1/63,000 per USD,
    // not the 63,000 the un-flipped base orientation would show
    expect(screen.getByText('1 USD = 0.00001587 BTC')).toBeInTheDocument()
  })

  it('prices the give side off the live quote, not an independently-estimated price that can disagree with it', async () => {
    // the wallet's own general BTC/USD estimate (FiatContext.toFiat, below)
    // and the market's own price feed are two unrelated sources — mismatch
    // them deliberately (market quotes BTC at $50k, the wallet's own feed at
    // $100k) to prove the give-side fiat value tracks the actual quote
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 50_000 }, price: '500000' }))
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    // 10,000 sats at the market's actual $50k/BTC rate is ~€4.99 (the €4.98
    // receive value grossed back up by the fee) — not the €10 the wallet's
    // own (mismatched, $100k) independent estimate would show
    await waitFor(() => expect(screen.getByText('€4.99')).toBeInTheDocument())
    expect(screen.queryByText('€10.00')).not.toBeInTheDocument()

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][1].fromFiatAmount).toBeCloseTo(4.99, 2)
  })

  it('snapshots a fiat entry at the rate the entry was converted with, not the solver-rate reconstruction', async () => {
    // same mismatched feeds as above (market $50k, wallet's own feed $100k),
    // but the amount is typed in fiat: the user committed €50, converted to
    // sats at the wallet's own rate — the persisted volume must echo that
    // €50.00 back, not re-value the deposit at the solver's rate (~€24.9)
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 50_000 }, price: '500000' }))
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    for (const key of ['5', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][1].fromFiatAmount).toBeCloseTo(50, 2)
  })

  it('promotes the converted value when toggling denominations, not the raw digits (#839)', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // €50 typed in fiat mode is 50,000 sats at the $100k feed
    for (const key of ['5', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))

    // the sats side must carry the converted 50,000 over — rereading the "50"
    // digits as 50 sats would show €0.05 here (and, from a Max entry, trip
    // Insufficient balance as in the issue report)
    await waitFor(() => expect(secondaryAmount()).toHaveTextContent('€50'))

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(acceptSwapQuote.mock.calls[0][1].fromFiatAmount).toBeCloseTo(50, 2)
  })

  it('keeps the visible fiat amount in sync with the keypad after changing denominations', async () => {
    fetchMocker.mockResponse(JSON.stringify({ bitcoin: { usd: 50_000 }, price: '500000' }))
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    await waitFor(() => expect(secondaryAmount()).toHaveTextContent('€4.99'))
    await userEvent.click(screen.getByRole('button', { name: 'Show EUR amount first' }))
    expect(primaryAmount()).toHaveTextContent('€4.99')

    await userEvent.click(screen.getByRole('button', { name: 'Delete digit' }))
    expect(primaryAmount()).toHaveTextContent('€4.9')
  })

  it('does not reuse a stale fiat quote while its replacement is loading', async () => {
    const feedBody = JSON.stringify({ bitcoin: { usd: 50_000 }, price: '500000' })
    let requestCount = 0
    let resolveRefresh: (() => void) | undefined
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(0)
    fetchMocker.mockImplementation(() => {
      requestCount += 1
      if (requestCount === 1) return Promise.resolve(new Response(feedBody))
      return new Promise<Response>((resolve) => {
        resolveRefresh = () => resolve(new Response(feedBody))
      })
    })
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }
    await waitFor(() => expect(secondaryAmount()).toHaveTextContent('€4.99'))

    // Expire the local feed cache so the replacement quote remains visibly
    // loading after the 600 ms debounce instead of resolving immediately.
    dateNow.mockReturnValue(31_000)
    await userEvent.click(screen.getByRole('button', { name: '0' }))
    await waitFor(() => expect(requestCount).toBe(2))
    fireEvent.click(screen.getByRole('button', { name: 'Show EUR amount first' }))

    expect(primaryAmount()).toHaveTextContent('€100.00')
    expect(primaryAmount()).not.toHaveTextContent('€4.99')

    await act(async () => resolveRefresh?.())
    dateNow.mockRestore()
  })

  it('lists the receive side of an asset↔asset market and pins asset-unit entry (#857)', async () => {
    renderSwap({
      swap: { markets: [btcUsdt, btcDepix, maratNapo] },
      flow: { swapFromAssetId: MARAT_ID, setSwapFromAssetId: vi.fn() },
    })

    await waitFor(() => expect(screen.getByLabelText(/^Swap amount,/)).toHaveTextContent(/MARAT/))

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    expect(await screen.findByRole('button', { name: /NAPO/i })).toBeInTheDocument()
  })

  it('funds the SDK available balance as-is, without holding back a second dust carrier', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))

    // the wallet holds 100,000 sats available (loaded async) next to USDT and
    // DEPIX; the SDK's `available` already excludes the dust carrier their
    // change needs, so the wallet must not subtract it again
    await userEvent.click(await screen.findByRole('button', { name: '100,000 sats' }))
    expect(primaryAmount()).toHaveTextContent('100000 sats')

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(100_000))
  })

  it('offers only the spendable part of an asset held partly in swap escrow', async () => {
    // a covenant VTXO stays owned but generic spending refuses it, so the
    // composer must cap at availableAssets — offering the owned total builds a
    // swap coin selection cannot fund
    renderSwap({
      config: { unit: Unit.SATS },
      flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() },
      wallet: {
        assetBalances: [{ assetId: USDT_ID, amount: BigInt(15_000) }],
        availableAssetBalances: [{ assetId: USDT_ID, amount: BigInt(10_000) }],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Bitcoin/i }))

    await userEvent.click(await screen.findByRole('button', { name: '100.00 USD' }))
    expect(screen.queryByRole('button', { name: '150.00 USD' })).not.toBeInTheDocument()

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(10_000))
  })

  it('hides Use max when the selected asset has no balance', () => {
    renderSwap({
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: { availableBalance: 0 },
    })

    expect(screen.queryByRole('button', { name: 'Use max' })).not.toBeInTheDocument()
  })

  it('preserves the exact max balance when denomination blocks swap places', async () => {
    renderSwap({
      config: { currency: Currencies.USD, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: { ...NO_ASSETS, availableBalance: 1_093_180 },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(await screen.findByRole('button', { name: '1,093,180 sats' }))
    expect(primaryAmount()).toHaveTextContent('1093180 sats')

    await userEvent.click(screen.getByRole('button', { name: 'Show USD amount first' }))
    expect(primaryAmount()).toHaveTextContent('$1,093.18')
    expect(secondaryAmount()).toHaveTextContent('1093180 sats')
    expect(screen.getByLabelText('Swap keypad for 1093.18')).toBeInTheDocument()

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(1_093_180))
  })

  it('reuses one cached feed value across quotes instead of refetching per keystroke', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'View quotes' })).toBeEnabled(), { timeout: 3_000 })

    const feedCalls = () => fetchMocker.mock.calls.filter(([url]) => String(url).includes('coingecko')).length
    await waitFor(() => expect(feedCalls()).toBeGreaterThan(0))
    const afterFirstQuote = feedCalls()
    expect(afterFirstQuote).toBeGreaterThan(0)

    // one more digit — a fresh debounced quote that must NOT hit the feed
    // again, or a burst of typing gets rate-limited into "Quote unavailable"
    await userEvent.click(screen.getByRole('button', { name: '0' }))
    await waitFor(() => expect(screen.getByText('99.70 USD')).toBeInTheDocument(), { timeout: 3_000 })

    expect(feedCalls()).toBe(afterFirstQuote)
  })

  it('types whole sats when the display unit is sats', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    const plan = quoteExchange.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(1_000))
    expect(plan.receive.atomic).toBe(BigInt(99))
  })

  it('quotes a sane amount when typing a fiat amount with the display unit set to sats', async () => {
    renderSwap({
      config: { unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: NO_ASSETS,
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // default entry mode is fiat; type "$100" without toggling to asset mode
    for (const key of ['1', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    const plan = quoteExchange.mock.calls[0][0]
    // $100 at $100,000/BTC = 0.001 BTC = 100,000 sats, not "0" (rounded to
    // whole BTC) and not a comma-grouped string the solver can't parse
    expect(plan.deposit.atomic).toBe(BigInt(100_000))
  })

  it('quotes the minimum in the asset being sent (BTC), not the asset being received (USDT)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // switch to asset-unit entry and type a sats amount well under the
    // market's minimum receivable USDT notional
    fireEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0']) {
      fireEvent.click(screen.getByRole('button', { name: key }))
    }

    await act(async () => vi.advanceTimersByTimeAsync(600))
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByText(/^Minimum /)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Refresh offers' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText(/^Minimum /).closest('[aria-live]')).not.toBeNull()
    expect(screen.getByText(/^Minimum /).closest('[data-sonner-toast]')).toBeNull()
    // the market card's 1,000-sat give-side floor outranks the smaller
    // converted receive-side minimum, and a 0-decimal unit shows whole sats
    expect(screen.getByText('Minimum 1,000 sats')).toBeInTheDocument()

    // the suggested bound rounds UP to the display precision, so entering
    // exactly the displayed minimum clears the error — round-to-nearest used
    // to show a minimum one sat short, forcing users to overshoot it
    const minSats = (screen.getByText(/^Minimum \S+ sats$/).textContent ?? '').replace(/[^0-9]/g, '')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Delete digit' }))
    for (const key of minSats) fireEvent.click(screen.getByRole('button', { name: key }))
    await act(async () => vi.advanceTimersByTimeAsync(600))
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByRole('button', { name: 'View quotes' })).toBeEnabled(), { timeout: 5_000 })
    await openSmartRoutingReview()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    expect(quoteExchange.mock.calls[0][0].deposit.atomic).toBe(BigInt(minSats))
    expect(quoteExchange.mock.calls[0][0].receive.atomic).toBe(BigInt(99))
  })

  it('quotes the minimum in the asset being sent (USD), not the asset being received (sats) — vice versa', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    renderSwap({ flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    // type a USD amount well under the market's minimum receivable sats notional
    for (const key of ['0', '.', '0', '1']) {
      fireEvent.click(screen.getByRole('button', { name: key }))
    }

    await act(async () => vi.advanceTimersByTimeAsync(600))
    vi.useRealTimers()
    await waitFor(() => expect(screen.getByText(/^Minimum /)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'View quotes' }))
    expect(screen.queryByRole('button', { name: 'Use smart routing' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Refresh offers' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByText(/^Minimum \S+ USD$/)).toBeInTheDocument()
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

  it('shows the Bitcoin balance and quotes in whole BTC when the display unit is BTC, not sats', async () => {
    renderSwap({
      config: { unit: Unit.BTC },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: NO_ASSETS,
    })

    // the mocked wallet balance (100,000 sats) is shown in whole-BTC terms, at
    // BTC's full 8-decimal precision — 0.00100000 BTC, not 0.001 BTC
    const balanceText = screen.getByText('0.00100000 BTC').textContent
    expect(balanceText).toBe('0.00100000 BTC')
    expect(balanceText).not.toMatch(/sats/)

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // switch to asset-mode entry and type "0.001" BTC — not 0.001 sats
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['0', '.', '0', '0', '1']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'View quotes' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    await openSmartRoutingReview(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(acceptSwapQuote).toHaveBeenCalledOnce())
    const plan = quoteExchange.mock.calls[0][0]
    // 0.001 BTC = 100,000 sats
    expect(plan.deposit.atomic).toBe(BigInt(100_000))
    expect(acceptSwapQuote.mock.calls[0][1]).toMatchObject({ fromTicker: 'BTC', fromDecimals: 8 })
  })

  it('follows the wallet bitcoin-unit setting for the swap amount, including when the currency-of-account is BTC', async () => {
    renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.BTC },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })

    // default entry mode is 'fiat' — with currency set to BTC that's a
    // bitcoin-denominated amount, which must render in the configured unit
    // (BTC here), not be forced to sats
    for (const key of ['1', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const amountLabel = primaryAmount().getAttribute('aria-label')
    expect(amountLabel).toMatch(/\sBTC$/)
  })

  it('never assigns the same React key to two occurrences of the same letter in the amount label', async () => {
    // "sats" has two 's' — a naive per-character key collapses them, which
    // React reports as a duplicate-key warning and the animated renderer
    // then smears the repeated glyph
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

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

  it('preserves the entered value when the denomination blocks swap places', async () => {
    renderSwap({
      config: { currency: Currencies.USD, unit: Unit.SATS },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })

    for (const key of ['1', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    expect(primaryAmount()).toHaveAccessibleName('Swap amount, $10')
    expect(secondaryAmount()).toHaveTextContent('10000 sats')
    expect(screen.getByRole('button', { name: 'Swap amount, $10' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    expect(primaryAmount()).toHaveAccessibleName('Swap amount, 10000 sats')
    expect(secondaryAmount()).toHaveTextContent('$10')
    expect(screen.getByRole('button', { name: 'Swap amount, 10000 sats' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    expect(primaryAmount()).toHaveAccessibleName('Swap amount, $10')
  })

  it.each([
    ['BTC', 'btc', Unit.BTC],
    ['BRL', DEPIX_ID, Unit.SATS],
    ['sats', 'btc', Unit.SATS],
  ])('animates the deleted digit without duplicating or reanimating the %s suffix', async (ticker, assetId, unit) => {
    renderSwap({
      config: { unit },
      flow: { swapFromAssetId: assetId, setSwapFromAssetId: vi.fn() },
    })
    if (primaryAmount().getAttribute('aria-label') !== `Swap amount, 0 ${ticker}`) {
      fireEvent.click(secondaryAmount())
    }
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '8' }))
    await waitFor(() => expect(primaryAmount().textContent).toBe(`18\u00a0${ticker}`))
    const suffix = Array.from(primaryAmount().querySelectorAll('.swap-amount-character')).slice(-ticker.length)

    fireEvent.click(screen.getByRole('button', { name: 'Delete digit' }))

    expect(primaryAmount()).toHaveAccessibleName(`Swap amount, 1 ${ticker}`)
    expect(primaryAmount().textContent).toBe(`18\u00a0${ticker}`)
    for (const letter of suffix) {
      expect(letter).toBeInTheDocument()
      expect(letter).not.toHaveClass('swap-amount-character--entering')
    }
    await waitFor(() => expect(primaryAmount().textContent).toBe(`1\u00a0${ticker}`))
  })

  it('settles to the latest amount when deletion is interrupted by another keypad tap', async () => {
    renderSwap({
      config: { unit: Unit.BTC, currency: Currencies.BTC },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })
    for (const key of ['1', '8', '4']) fireEvent.click(screen.getByRole('button', { name: key }))
    await waitFor(() => expect(primaryAmount().textContent).toBe('184\u00a0BTC'))

    fireEvent.click(screen.getByRole('button', { name: 'Delete digit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete digit' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))

    expect(primaryAmount()).toHaveAccessibleName('Swap amount, 12 BTC')
    await waitFor(() => expect(primaryAmount().textContent).toBe('12\u00a0BTC'))
  })

  it('deletes decimal digits and the decimal point through zero with reduced motion', async () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    renderSwap({
      config: { unit: Unit.BTC, currency: Currencies.BTC },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })
    for (const key of ['1', '.', '8']) fireEvent.click(screen.getByRole('button', { name: key }))
    await waitFor(() => expect(primaryAmount().textContent).toBe('1.8\u00a0BTC'))

    for (const amount of ['1.', '1', '0']) {
      fireEvent.click(screen.getByRole('button', { name: 'Delete digit' }))
      await waitFor(() => expect(primaryAmount().textContent).toBe(`${amount}\u00a0BTC`))
      for (const character of primaryAmount().querySelectorAll('.swap-amount-character')) {
        expect(character).not.toHaveClass('swap-amount-character--entering')
        expect(character.getAttribute('style') ?? '').not.toContain('translate')
        expect(character.parentElement?.getAttribute('style') ?? '').not.toContain('translate')
      }
    }
  })

  it('keeps the digit animation mounted when a new value triggers a validation error', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    const amountValue = screen.getByTestId('swap-amount-value-shake')

    for (const key of ['1', '2', '2']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    await screen.findByRole('button', { name: /^Use maximum/ }, { timeout: 3_000 })
    expect(screen.getByTestId('swap-amount-value-shake')).toBe(amountValue)
  })

  it('keeps swap history out of the swap composer', () => {
    renderSwap({ swap: { swaps: [pendingSwap] } })
    expect(screen.queryByText('Your swaps')).not.toBeInTheDocument()
    expect(screen.queryByText('BTC to USD')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})
