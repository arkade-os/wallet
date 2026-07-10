import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import WalletSwap from '../../../screens/Wallet/Swap/Index'
import { clearDiscoveryCaches } from '../../../lib/discovery'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages, Tabs } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { DEPIX_ID, depixMarket, index, jsonResponse } from '../../lib/discovery/fixtures'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

// The wallet holds 30000.00 DePix (decimals 2). The discovered market prices
// DePix -> BTC at 2 sats per DePix cent, fee 0, default safety cushion 50 bps.
const depix = depixMarket({ price_decimals: 0, fee_bps: 0, min_base_amount: 1, max_base_amount: 100000000 })

function renderSwapOnMutinynet() {
  const assetMetadataCache = new Map([[DEPIX_ID, { metadata: { name: 'Depix', ticker: 'DEPIX', decimals: 2 } }]])
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
    <NavigationContext.Provider value={{ ...mockNavigationContextValue, screen: Pages.WalletSwap, tab: Tabs.Wallet }}>
      <ConfigContext.Provider value={{ ...mockConfigContextValue, configLoaded: true } as any}>
        <FiatContext.Provider value={mockFiatContextValue as any}>
          <FlowContext.Provider value={mockFlowContextValue as any}>
            <AspContext.Provider
              value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' } }}
            >
              <WalletContext.Provider
                value={
                  {
                    ...mockWalletContextValue,
                    balance: 250000,
                    assetBalances: [{ assetId: DEPIX_ID, amount: 3000000 }],
                    assetMetadataCache,
                  } as any
                }
              >
                <WalletSwap />
              </WalletContext.Provider>
            </AspContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>,
  )
}

describe('Wallet swap priced via the discovery protocol', () => {
  beforeEach(() => {
    clearDiscoveryCaches()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/mutinynet.json')) return jsonResponse(index({ markets: [depix] }))
        if (url.startsWith('https://feed.example.com/depix')) return jsonResponse('2')
        return jsonResponse({}, 404)
      }),
    )
  })

  it('prices DePix -> BTC from the discovered market feed, matching wallet asset ids', async () => {
    renderSwapOnMutinynet()

    fireEvent.click(screen.getByRole('button', { name: /Depix/i }))
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))

    // DePix has no USD estimate, so input is asset-denominated: 100.00 DEPIX.
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    // The registry lists the market under DePix's on-chain asset id — the same
    // id the wallet holds the balance under. deposit 10000 (cents) * price 2
    // * (1 - 50/10000 safety) = 19900 sats = 0.000199 BTC.
    await waitFor(() => expect(screen.getByText('0.000199 BTC')).toBeInTheDocument(), { timeout: 3000 })

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    await waitFor(() => expect(continueButton).toBeEnabled())
    fireEvent.click(continueButton)

    // The review drawer attributes the quote to the discovered solver.
    await waitFor(() => expect(screen.getByText(/depix-solver/)).toBeInTheDocument())
  })

  it('falls back to unavailable when no market lists the pair for this network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/mutinynet.json')) return jsonResponse(index({ markets: [] }))
        return jsonResponse({}, 404)
      }),
    )
    renderSwapOnMutinynet()

    fireEvent.click(screen.getByRole('button', { name: /Depix/i }))
    fireEvent.click(screen.getByRole('button', { name: /Receive Choose asset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Bitcoin/i }))
    fireEvent.click(screen.getByRole('button', { name: '1' }))

    await waitFor(() => expect(screen.getByText('Swap unavailable for this pair')).toBeInTheDocument(), {
      timeout: 3000,
    })
  })
})
