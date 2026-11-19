import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'
import { NavigationContext, Pages } from '../../../providers/navigation'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockNavigationContextValue,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { SwapsContext } from '../../../providers/swaps'
import { AssetsContext } from '../../../providers/assets'
import { AspContext } from '../../../providers/asp'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'

describe('Wallet screen', () => {
  it('renders the wallet screen with the correct elements', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <SwapsContext.Provider value={{ swapAvailable: true, swaps: [] } as any}>
          <Wallet />
        </SwapsContext.Provider>
      </NavigationContext.Provider>,
    )
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Send')).toBeInTheDocument()
    expect(screen.getByText('Receive')).toBeInTheDocument()
    expect(screen.getByTestId('home-action-swap')).toBeEnabled()
    await user.click(screen.getByTestId('home-action-swap'))
    expect(navigate).toHaveBeenCalledWith(Pages.WalletSwap)
    expect(screen.getByText('Accounts')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
    // Home carries no promotions and no Apps entry; Buy or sell lives in Settings.
    expect(screen.queryByText('Buy or sell Bitcoin')).not.toBeInTheDocument()
    expect(screen.queryByText('Borrow against your bitcoin')).not.toBeInTheDocument()
    // Activity opens from the section itself; Scan and Settings are the only header actions.
    expect(screen.queryByTestId('top-right-activity')).not.toBeInTheDocument()
    // It is there with no history too: on a phone it is the only way into Activity.
    await user.click(screen.getByTestId('activity-view-all'))
    expect(navigate).toHaveBeenCalledWith(Pages.Activity)
    expect(screen.getByTestId('home-action-scan')).toBeInTheDocument()

    await user.click(screen.getByTestId('top-right-settings'))
    expect(navigate).toHaveBeenCalledWith(Pages.Settings)
  })

  it('sets Receive and Send like the site buttons and keeps their plain names', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <SwapsContext.Provider value={{ swapAvailable: true, swaps: [] } as any}>
          <Wallet />
        </SwapsContext.Provider>
      </NavigationContext.Provider>,
    )

    const receive = screen.getByRole('button', { name: 'Receive' })
    const send = screen.getByRole('button', { name: 'Send' })
    // the capitals are styling: screen readers still hear "Receive" and "Send"
    expect(receive).toHaveClass('button', 'outline')
    expect(send).toHaveClass('button', 'dark')
    // each ends in a pixel arrow, drawn on the 5×5 grid
    for (const button of [receive, send]) {
      const arrow = button.querySelector('svg[viewBox="0 0 5 5"]')
      expect(arrow).not.toBeNull()
      expect(arrow?.querySelectorAll('rect')).toHaveLength(9)
    }
    // Accounts and Recent activity open under the section rule
    expect(screen.getByText('Accounts').closest('.home-section--ruled')).not.toBeNull()
    expect(screen.getByText('Recent activity').closest('.home-section--ruled')).not.toBeNull()

    await user.click(receive)
    expect(navigate).toHaveBeenCalledWith(Pages.ReceiveQRCode)
    await user.click(send)
    expect(navigate).toHaveBeenCalledWith(Pages.SendForm)
  })

  it('opens Activity from the section when there is history to show', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [mockTxInfo] as any }}>
          <SwapsContext.Provider value={{ swapAvailable: true, swaps: [] } as any}>
            <Wallet />
          </SwapsContext.Provider>
        </WalletContext.Provider>
      </NavigationContext.Provider>,
    )

    await user.click(screen.getByTestId('activity-view-all'))
    expect(navigate).toHaveBeenCalledWith(Pages.Activity)
  })

  it('does not use swap history to enter an unavailable swap composer', async () => {
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <SwapsContext.Provider value={{ swapAvailable: false, swaps: [{ id: 'pending-swap' }] } as any}>
          <Wallet />
        </SwapsContext.Provider>
      </NavigationContext.Provider>,
    )

    await userEvent.click(screen.getByTestId('home-action-swap'))

    expect(navigate).not.toHaveBeenCalledWith(Pages.WalletSwap)
    expect(screen.getByText(/Swaps are coming soon/i)).toBeInTheDocument()
  })

  it('shows the verified Mutinynet USDT asset as the USD account', () => {
    render(
      <AspContext.Provider
        value={
          {
            ...mockAspContextValue,
            aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' },
          } as any
        }
      >
        <AssetsContext.Provider value={{ isRegistered: (assetId) => assetId === MUTINYNET_USDT_ASSET_ID }}>
          <ConfigContext.Provider value={mockConfigContextValue as any}>
            <WalletContext.Provider
              value={
                {
                  ...mockWalletContextValue,
                  isVerifiedAsset: (assetId: string) => assetId === MUTINYNET_USDT_ASSET_ID,
                  assetBalances: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(1_000) }],
                  assetMetadataCache: new Map([
                    [MUTINYNET_USDT_ASSET_ID, { metadata: { decimals: 2, name: 'Tether USD', ticker: 'USDT' } }],
                  ]),
                } as any
              }
            >
              <Wallet />
            </WalletContext.Provider>
          </ConfigContext.Provider>
        </AssetsContext.Provider>
      </AspContext.Provider>,
    )

    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('10.00 USD')).toBeInTheDocument()
    expect(screen.queryByText('USDT')).not.toBeInTheDocument()
  })

  it('keeps unverified assets off the home screen entirely', () => {
    const navigate = vi.fn()
    const assetId = 'custom-asset'

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <ConfigContext.Provider
          value={{
            ...mockConfigContextValue,
            config: { ...mockConfigContextValue.config, importedAssets: [assetId] },
          }}
        >
          <WalletContext.Provider
            value={
              {
                ...mockWalletContextValue,
                assetBalances: [{ assetId, amount: BigInt(1_000) }],
                assetMetadataCache: new Map([
                  [assetId, { metadata: { decimals: 2, name: 'Custom asset', ticker: 'TKN' } }],
                ]),
              } as any
            }
          >
            <Wallet />
          </WalletContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.queryByTestId(/^asset-row-TKN-/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('asset-row-other-assets')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalledWith(Pages.AppAssetDetail)
  })
})
