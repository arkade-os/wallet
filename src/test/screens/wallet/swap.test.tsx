import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ReactNode, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { AspContext } from '../../../providers/asp'
import { AssetsContext } from '../../../providers/assets'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SwapVariant } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import type { AssetSwap } from '../../../lib/swap/store'
import { Currencies, Unit } from '../../../lib/types'
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

function SwapTestFlowProvider({ children, flow }: { children: ReactNode; flow: Record<string, unknown> }) {
  const [swapVariant, setSwapVariant] = useState<SwapVariant>((flow.swapVariant as SwapVariant) ?? 'current')

  return (
    <FlowContext.Provider value={{ ...mockFlowContextValue, ...flow, swapVariant, setSwapVariant } as any}>
      {children}
    </FlowContext.Provider>
  )
}

function renderSwap({
  flow = {},
  swap = {},
  config = {},
  wallet = {},
}: {
  flow?: Record<string, unknown>
  swap?: Record<string, unknown>
  config?: Record<string, unknown>
  wallet?: Record<string, unknown>
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
              <SwapTestFlowProvider flow={flow}>
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
                      availableBalance: 100_000,
                      ...wallet,
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
              </SwapTestFlowProvider>
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

  it('starts Receive first by choosing the asset to receive', () => {
    renderSwap({ flow: { swapVariant: 'receive-first' } })

    expect(screen.getByText('Choose asset to receive')).toBeInTheDocument()
    expect(screen.queryByText('Choose asset to swap')).not.toBeInTheDocument()
  })

  it('starts Send or receive with the intent choice', () => {
    renderSwap({ flow: { swapVariant: 'segmented' } })

    expect(screen.getByText('Start with')).toBeInTheDocument()
    expect(screen.getByLabelText('Swap intent')).toBeInTheDocument()
  })

  it('keeps the BRL identity and flag after spending the full DePix balance', () => {
    renderSwap({
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
      wallet: { assetBalances: [{ assetId: USDT_ID, amount: BigInt(15_000) }] },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))

    expect(screen.getByText('BRL')).toBeInTheDocument()
    expect(screen.queryByText(/DePix|DEPIX/)).not.toBeInTheDocument()
    expect(document.querySelector('#br-flag-circle')).not.toBeNull()
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
    // the default display unit is BTC (mockConfigContextValue) — the swap
    // entry/ticker/decimals follow it, same as the rest of the wallet
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromTicker: 'BTC', toTicker: 'USD', feeBps: 30 })
    // fromDecimals must pair with fromTicker ('BTC' -> 8), the solver's real
    // protocol decimals — otherwise the persisted receipt mislabels the scale
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromDecimals: 8 })
  })

  it('quotes an exact 5 USD receive amount while the wallet is denominated in EUR', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    fireEvent.click(screen.getByRole('button', { name: /Set receive amount/ }))
    const amountDrawer = screen.getByRole('dialog')
    fireEvent.click(within(amountDrawer).getByRole('button', { name: '5' }))

    expect(within(amountDrawer).getByLabelText('5 USD')).toBeInTheDocument()
    await waitFor(() => expect(within(amountDrawer).getByRole('button', { name: 'Done' })).toBeEnabled(), {
      timeout: 3_000,
    })
    fireEvent.click(within(amountDrawer).getByRole('button', { name: 'Done' }))
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    expect(screen.getAllByText(/^1 BTC = /).length).toBeGreaterThan(0)

    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(createSwap.mock.calls[0][0].receive.atomic).toBe(BigInt(500))
  })

  it('does not replace a newly entered send amount with a stale receive quote', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))

    const receiveAmountButton = screen.getByRole('button', { name: /Set receive amount/ })
    expect(receiveAmountButton).toBeDisabled()
    expect(within(screen.getByLabelText('Swap amount')).getByLabelText('€5')).toBeInTheDocument()

    await waitFor(() => expect(receiveAmountButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(receiveAmountButton)
    expect(within(screen.getByRole('dialog')).queryByLabelText('0 USD')).not.toBeInTheDocument()
  })

  it('accepts an exact BTC receive amount when swapping from USD', async () => {
    renderSwap({
      config: { unit: Unit.BTC },
      flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() },
    })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(screen.getByRole('button', { name: /Set receive amount/ }))
    const amountDrawer = screen.getByRole('dialog')
    for (const key of ['0', '.', '0', '0', '1']) {
      fireEvent.click(within(amountDrawer).getByRole('button', { name: key }))
    }

    expect(within(amountDrawer).getByLabelText('0.001 BTC')).toBeInTheDocument()
    await waitFor(() => expect(within(amountDrawer).getByRole('button', { name: 'Done' })).toBeEnabled(), {
      timeout: 3_000,
    })
    fireEvent.click(within(amountDrawer).getByRole('button', { name: 'Done' }))
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))
    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(createSwap.mock.calls[0][0].receive.atomic).toBe(BigInt(100_000))
  })

  it('keeps the send layout in place while editing the receive amount in a drawer', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))

    expect(screen.getByRole('button', { name: 'Choose swap flow variant' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Set receive amount/ }))
    const amountDrawer = screen.getByRole('dialog')
    fireEvent.click(within(amountDrawer).getByRole('button', { name: '5' }))
    expect(within(amountDrawer).getByLabelText('5 USD')).toBeInTheDocument()
    expect(within(amountDrawer).queryByText('Receive amount')).not.toBeInTheDocument()
    expect(within(amountDrawer).queryByText(/^Send /)).not.toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.queryByText('Send BTC')).not.toBeInTheDocument()

    await waitFor(() => expect(within(amountDrawer).getByRole('button', { name: 'Done' })).toBeEnabled(), {
      timeout: 3_000,
    })
    expect(within(amountDrawer).getByText(/^[€$]\d/)).toBeInTheDocument()
    fireEvent.click(within(amountDrawer).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Set receive amount, currently 5.00 USD/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Choose receive asset, currently USD' }))
    const assetDrawer = screen.getByRole('dialog')
    fireEvent.click(within(assetDrawer).getByRole('button', { name: /USD/i }))
    expect(screen.getByRole('button', { name: /Set receive amount, currently 5.00 USD/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '1' }))
    expect(within(screen.getByLabelText('Swap amount')).getByLabelText('€1')).toBeInTheDocument()
  })

  it('switches between all seven temporary swap flows and changes units on every editable card', async () => {
    renderSwap()
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))

    const chooseVariant = () => fireEvent.click(screen.getByRole('button', { name: 'Choose swap flow variant' }))
    const selectVariant = (name: RegExp) => {
      chooseVariant()
      fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'Swap flow variants' })).getByRole('radio', { name }),
      )
    }

    chooseVariant()
    const variantSwitcher = screen.getByRole('radiogroup', { name: 'Swap flow variants' })
    expect(within(variantSwitcher).getByText('Current')).toBeInTheDocument()
    expect(within(variantSwitcher).getAllByRole('radio')).toHaveLength(7)
    expect(within(variantSwitcher).getByRole('radio', { name: /Current/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(variantSwitcher).getByRole('radio', { name: /Receive first/ }))

    expect(screen.getByRole('button', { name: 'Choose swap flow variant' })).toHaveTextContent('V2')
    expect(await screen.findByText('Choose asset to receive')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    expect(await screen.findByLabelText('You receive amount')).toHaveTextContent('0 USD')
    fireEvent.click(screen.getByRole('button', { name: 'Show EUR amount first' }))
    expect(within(screen.getByLabelText('You receive amount')).getByLabelText('€0')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByLabelText('Swap keypad for 5')).toBeInTheDocument()
    await waitFor(() =>
      expect(within(screen.getByLabelText('You receive amount')).getByLabelText('€5')).toBeInTheDocument(),
    )
    expect(screen.getAllByLabelText(/Swap keypad/)).toHaveLength(1)

    selectVariant(/Send or receive/)
    expect(await screen.findByText('Start with')).toBeInTheDocument()
    fireEvent.click(within(screen.getByLabelText('Swap intent')).getByRole('button', { name: 'You receive' }))
    expect(await screen.findByText('Choose asset to receive')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    fireEvent.click(within(await screen.findByLabelText('Amount input')).getByRole('button', { name: 'You receive' }))
    expect(screen.getByLabelText('You receive amount')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show EUR amount first' }))
    expect(within(screen.getByLabelText('You receive amount')).getByLabelText('€0')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    selectVariant(/Promote field/)
    expect(await screen.findByText('Choose asset to swap')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Promote receive amount' }))
    expect(screen.getByLabelText('You receive amount')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show EUR amount first' }))
    expect(within(screen.getByLabelText('You receive amount')).getByLabelText('€0')).toBeInTheDocument()

    selectVariant(/Equal inputs/)
    expect(await screen.findByText('Choose asset to swap')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Choose you receive asset' }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    expect(await screen.findByRole('button', { name: 'You send amount' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'You receive amount' }))
    expect(screen.getByRole('button', { name: 'You receive amount' })).toHaveAttribute('aria-pressed', 'true')
    const equalUnitSwitchers = screen.getAllByRole('button', { name: 'Show EUR amount first' })
    expect(equalUnitSwitchers).toHaveLength(2)
    fireEvent.click(equalUnitSwitchers[1])
    expect(within(screen.getByRole('button', { name: 'You receive amount' })).getByLabelText('€0')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Swap keypad/)).toHaveLength(1)

    selectVariant(/Native keyboard/)
    expect(await screen.findByText('Choose asset to swap')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Choose you receive asset' }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    expect(screen.getByRole('button', { name: 'Choose swap flow variant' })).toHaveTextContent('V6')
    expect(screen.queryByLabelText(/Swap keypad/)).not.toBeInTheDocument()
    const nativeUnitSwitchers = screen.getAllByRole('button', { name: 'Show EUR amount first' })
    expect(nativeUnitSwitchers).toHaveLength(2)
    fireEvent.click(nativeUnitSwitchers[1])
    const receiveInput = await screen.findByRole('textbox', { name: 'You receive amount' })
    expect(receiveInput).toHaveAttribute('inputmode', 'decimal')
    expect(receiveInput.parentElement).toHaveTextContent('EUR')
    await userEvent.clear(receiveInput)
    await userEvent.type(receiveInput, '5.25')
    expect(receiveInput).toHaveValue('5.25')

    const sendInput = screen.getByRole('textbox', { name: 'You send amount' })
    await userEvent.clear(sendInput)
    await userEvent.type(sendInput, '0.001')
    expect(sendInput).toHaveValue('0.001')

    selectVariant(/Header dropdown/)
    expect(await screen.findByText('Choose asset to swap')).toBeInTheDocument()
    const directionSelector = screen.getByRole('button', {
      name: 'Choose swap amount direction, currently from',
    })
    expect(directionSelector).toHaveTextContent('from')
    fireEvent.click(directionSelector)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'to' }))
    expect(await screen.findByText('Choose asset to receive')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    expect(screen.getByRole('button', { name: 'Choose swap amount direction, currently to' })).toHaveTextContent('to')
    const receiveAmount = await screen.findByLabelText('You receive amount')
    expect(receiveAmount).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Show EUR amount first' }))
    expect(within(receiveAmount).getByLabelText('€0')).toBeInTheDocument()

    selectVariant(/Receive first/)
    fireEvent.click(await screen.findByRole('button', { name: /USD/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Choose send asset, currently BTC' }))
    expect(within(screen.getByRole('dialog')).getByText('Choose asset to swap')).toBeInTheDocument()
  }, 10_000)

  it('preserves the receive drawer amount when its quote is unavailable', async () => {
    fetchMocker.mockReject(new Error('feed unavailable'))
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Set receive amount/ }))
    const amountDrawer = screen.getByRole('dialog')
    fireEvent.click(within(amountDrawer).getByRole('button', { name: '5' }))

    await waitFor(() => expect(within(amountDrawer).getByText('Quote unavailable')).toBeInTheDocument(), {
      timeout: 3_000,
    })
    expect(within(amountDrawer).getByLabelText('5 USD')).toBeInTheDocument()
    fireEvent.click(within(amountDrawer).getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('does not suggest a misleading numeric minimum for an exact receive amount', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    fireEvent.click(screen.getByRole('button', { name: /Set receive amount/ }))
    const amountDrawer = screen.getByRole('dialog')
    for (const key of ['0', '.', '5']) fireEvent.click(within(amountDrawer).getByRole('button', { name: key }))

    await waitFor(() => expect(within(amountDrawer).getByText('Amount below minimum')).toBeInTheDocument(), {
      timeout: 3_000,
    })
    expect(within(amountDrawer).queryByText(/^Minimum /)).not.toBeInTheDocument()
  })

  it('keeps the original send layout at zero after clearing the receive drawer', async () => {
    renderSwap({ flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Set receive amount/ }))
    const amountDrawer = screen.getByRole('dialog')
    fireEvent.click(within(amountDrawer).getByRole('button', { name: '5' }))
    await waitFor(() => expect(within(amountDrawer).getByRole('button', { name: 'Done' })).toBeEnabled(), {
      timeout: 3_000,
    })

    fireEvent.click(within(amountDrawer).getByRole('button', { name: 'Delete digit' }))
    expect(within(amountDrawer).getByLabelText('0 USD')).toBeInTheDocument()
    fireEvent.click(within(amountDrawer).getByRole('button', { name: 'Done' }))

    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Swap amount')).getByLabelText('€0')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Set receive amount, currently 0.00 USD/ })).toBeInTheDocument(),
    )
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

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    expect(screen.getByRole('heading', { name: 'BTC to USD' })).toBeInTheDocument()
    // the review drawer's rate is quoted per whole BTC, not per satoshi
    expect(screen.getAllByText(/^1 BTC = /).length).toBeGreaterThan(0)
    // the fee is shown in the receive asset (USD), not the wallet's display
    // currency — 9.97 received net of a 0.30% fee means a 0.03 USD fee
    expect(screen.getByText('0.03 USD')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(screen.getByText('BTC to USD · Waiting for fill')).toBeInTheDocument()
    const plan = createSwap.mock.calls[0][0]
    expect(plan.deposit.atomic).toBe(BigInt(10_000))
    // 10_000 sats * 0.1 cents/sat * (10000 - 30)bps = 997 cents
    expect(plan.receive.atomic).toBe(BigInt(997))
    // the persisted quote snapshot must carry the same correct fiat value
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromFiatAmount: 10 })
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

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)

    // the review drawer's Swap/Receive/Fees are all in sats — none may carry a
    // fractional part ("532.333 sats" is not a representable amount)
    expect(screen.getByText('Confirm swap')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'USD to BTC' })).toBeInTheDocument()
    expect(screen.queryByText(/\d\.\d+ sats/)).not.toBeInTheDocument()
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

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(createSwap.mock.calls[0][1].fromFiatAmount).toBeCloseTo(4.99, 2)
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

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(createSwap.mock.calls[0][1].fromFiatAmount).toBeCloseTo(50, 2)
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
    await waitFor(() => expect(screen.getByText('€50.00')).toBeInTheDocument())
  })

  it('funds the whole balance when the balance under the from-asset is tapped', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))

    // the wallet holds 100,000 sats (loaded async) — tapping enters all of it
    await userEvent.click(await screen.findByRole('button', { name: '100,000 sats' }))
    expect(screen.getByLabelText('Swap amount')).toHaveTextContent('100000 sats')

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    expect(createSwap.mock.calls[0][0].deposit.atomic).toBe(BigInt(100_000))
  })

  it('reuses one cached feed value across quotes instead of refetching per keystroke', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled(), { timeout: 3_000 })

    const feedCalls = () => fetchMocker.mock.calls.filter(([url]) => String(url).includes('coingecko')).length
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

  it('quotes the minimum in the asset being sent (BTC), not the asset being received (USDT)', async () => {
    renderSwap({ config: { unit: Unit.SATS }, flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // switch to asset-unit entry and type a sats amount well under the
    // market's minimum receivable USDT notional
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['1', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    await waitFor(() => expect(screen.getByText(/^Minimum /)).toBeInTheDocument())
    // the market card's 1,000-sat give-side floor outranks the smaller
    // converted receive-side minimum, and a 0-decimal unit shows whole sats
    expect(screen.getByText('Minimum 1,000 sats')).toBeInTheDocument()

    // the suggested bound rounds UP to the display precision, so entering
    // exactly the displayed minimum clears the error — round-to-nearest used
    // to show a minimum one sat short, forcing users to overshoot it
    const minSats = (screen.getByText(/^Minimum \S+ sats$/).textContent ?? '').replace(/[^0-9]/g, '')
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole('button', { name: 'Delete digit' }))
    for (const key of minSats) await userEvent.click(screen.getByRole('button', { name: key }))
    await waitFor(() => expect(screen.queryByText(/^Minimum /)).not.toBeInTheDocument(), { timeout: 5_000 })
  })

  it('quotes the minimum in the asset being sent (USD), not the asset being received (sats) — vice versa', async () => {
    renderSwap({ flow: { swapFromAssetId: USDT_ID, setSwapFromAssetId: vi.fn() } })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    // type a USD amount well under the market's minimum receivable sats notional
    for (const key of ['0', '.', '0', '1']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    await waitFor(() => expect(screen.getByText(/^Minimum /)).toBeInTheDocument())
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
    })

    // the mocked wallet balance (100,000 sats) is shown in whole-BTC terms, at
    // BTC's full 8-decimal precision — 0.00100000 BTC, not 0.001 BTC
    const balanceText = (await screen.findByRole('button', { name: /BTC$/ })).textContent
    expect(balanceText).toBe('0.00100000 BTC')
    expect(balanceText).not.toMatch(/sats/)

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /USD/i }))
    // switch to asset-mode entry and type "0.001" BTC — not 0.001 sats
    await userEvent.click(screen.getByRole('button', { name: /Show .+ first/ }))
    for (const key of ['0', '.', '0', '0', '1']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled(), { timeout: 3_000 })
    fireEvent.click(continueButton)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm swap' }))

    await waitFor(() => expect(createSwap).toHaveBeenCalledOnce())
    const plan = createSwap.mock.calls[0][0]
    // 0.001 BTC = 100,000 sats
    expect(plan.deposit.atomic).toBe(BigInt(100_000))
    expect(createSwap.mock.calls[0][1]).toMatchObject({ fromTicker: 'BTC', fromDecimals: 8 })
  })

  it('follows the wallet bitcoin-unit setting for the swap amount, including when the currency-of-account is BTC', async () => {
    const { container } = renderSwap({
      config: { currency: Currencies.BTC, unit: Unit.BTC },
      flow: { swapFromAssetId: 'btc', setSwapFromAssetId: vi.fn() },
    })

    // default entry mode is 'fiat' — with currency set to BTC that's a
    // bitcoin-denominated amount, which must render in the configured unit
    // (BTC here), not be forced to sats
    for (const key of ['1', '0', '0']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }

    const amountLabel = container.querySelector('.swap-amount-display .swap-amount-value')?.getAttribute('aria-label')
    expect(amountLabel).toMatch(/ BTC$/)
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

  it('keeps swap history out of the swap composer', () => {
    renderSwap({ swap: { swaps: [pendingSwap] } })
    expect(screen.queryByText('Your swaps')).not.toBeInTheDocument()
    expect(screen.queryByText('BTC to USD')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})
