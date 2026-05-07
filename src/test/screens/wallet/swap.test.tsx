import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
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
  it('renders the codex and claude structural variant switchers', async () => {
    renderSwap()

    expect(screen.getByRole('heading', { name: 'Stacked quote' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1 Stacked quote/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /10 Minimal trade/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Claude' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Family flow' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /10 Market slip/i })).toBeInTheDocument()
  })

  it('keeps the screen in the wallet back stack', async () => {
    const { goBack } = renderSwap()

    await userEvent.click(screen.getByLabelText('Go back'))

    expect(goBack).toHaveBeenCalled()
  })
})
