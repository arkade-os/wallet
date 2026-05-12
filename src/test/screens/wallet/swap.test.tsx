import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
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

function renderSwap() {
  const navigate = vi.fn()
  const goBack = vi.fn()
  const assetMetadataCache = new Map([
    [
      assetId,
      {
        metadata: {
          name: 'POOP',
          ticker: 'POP',
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
          <FlowContext.Provider value={mockFlowContextValue as any}>
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

describe('Wallet swap prototype', () => {
  it('starts with an asset picker, then opens the focused amount step', async () => {
    renderSwap()

    expect(screen.queryByText('Stacked quote')).not.toBeInTheDocument()
    expect(screen.queryByText('Composer first, quote second')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Codex/i })).not.toBeInTheDocument()
    expect(screen.getByText('Choose asset to swap')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search assets')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))

    expect(screen.getByLabelText('Swap amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Swap keypad for 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('keeps the screen in the wallet back stack', async () => {
    const { goBack } = renderSwap()

    await userEvent.click(screen.getByLabelText('Go back'))

    expect(goBack).toHaveBeenCalled()
  })
})
