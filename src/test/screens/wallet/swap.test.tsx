import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages, Tabs } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

const assetId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'

function renderSwap(flowOverrides = {}) {
  const navigate = vi.fn()
  const goBack = vi.fn()
  const assetMetadataCache = new Map([
    [
      assetId,
      {
        metadata: {
          name: 'USDC',
          ticker: 'USDC',
          decimals: 2,
        },
      },
    ],
  ])
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

  render(
    <NavigationContext.Provider
      value={{
        ...mockNavigationContextValue,
        goBack,
        navigate,
        screen: Pages.WalletSwap,
        tab: Tabs.Wallet,
      }}
    >
      <ConfigContext.Provider value={{ ...mockConfigContextValue, configLoaded: true } as any}>
        <FiatContext.Provider value={mockFiatContextValue as any}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, ...flowOverrides } as any}>
            <WalletContext.Provider
              value={
                {
                  ...mockWalletContextValue,
                  balance: 250000,
                  assetBalances: [{ assetId, amount: 150000 }],
                  assetMetadataCache,
                } as any
              }
            >
              <WalletSwap />
            </WalletContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )

  return { navigate, goBack }
}

describe('Wallet swap flow', () => {
  it('starts with an asset picker, then opens the focused amount step', async () => {
    renderSwap()

    expect(screen.queryByText('Stacked quote')).not.toBeInTheDocument()
    expect(screen.queryByText('Composer first, quote second')).not.toBeInTheDocument()
    expect(screen.getByText('Choose asset to swap')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search assets')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))

    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Swap keypad for 0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('keeps the screen in the wallet back stack', async () => {
    const { goBack } = renderSwap()

    await userEvent.click(screen.getByLabelText('Go back'))

    expect(goBack).toHaveBeenCalled()
  })

  it('opens directly on the amount step when launched from an asset detail page', () => {
    const setSwapFromAssetId = vi.fn()

    renderSwap({ swapFromAssetId: assetId, setSwapFromAssetId })

    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0)
    expect(screen.queryByText('Choose asset to swap')).not.toBeInTheDocument()
    expect(setSwapFromAssetId).toHaveBeenCalledWith(undefined)
  })

  it('explains that the review rate can update', async () => {
    const setSwapFromAssetId = vi.fn()

    renderSwap({ swapFromAssetId: assetId, setSwapFromAssetId })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(screen.getByRole('button', { name: '1' }))

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    expect(screen.getByText('Rate')).toBeInTheDocument()
    const rateInfo = screen.getByLabelText('Rates are dynamic and may update before you confirm.')
    expect(rateInfo).toBeInTheDocument()

    fireEvent.click(rateInfo)

    expect(screen.getByRole('tooltip')).toBeVisible()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Rates are dynamic and may update before you confirm.')
  })

  it('shows a human-readable amount and fee breakdown', async () => {
    const setSwapFromAssetId = vi.fn()

    renderSwap({ swapFromAssetId: assetId, setSwapFromAssetId })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    const review = within(screen.getByRole('dialog'))
    expect(review.getByText('Swap')).toBeInTheDocument()
    expect(review.getByText('50 USD')).toBeInTheDocument()
    expect(review.getByText('Receive')).toBeInTheDocument()
    expect(review.getByText('Fees')).toBeInTheDocument()
    expect(review.getByText('$0.00')).toBeInTheDocument()
    expect(review.queryByText('Total value')).not.toBeInTheDocument()
    expect(review.queryByText('Estimated receive')).not.toBeInTheDocument()
  })

  it('auto-dismisses the review rate note after tapping it', async () => {
    const setSwapFromAssetId = vi.fn()

    renderSwap({ swapFromAssetId: assetId, setSwapFromAssetId })

    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(screen.getByRole('button', { name: '1' }))

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    const rateInfo = screen.getByLabelText('Rates are dynamic and may update before you confirm.')

    fireEvent.click(rateInfo)

    expect(screen.getByRole('tooltip')).toBeVisible()

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(), { timeout: 3500 })
  })
})
