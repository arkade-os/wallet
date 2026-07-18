import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'
import { NavigationContext, Pages } from '../../../providers/navigation'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import { AssetsContext } from '../../../providers/assets'
import { AspContext } from '../../../providers/asp'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'

describe('Wallet screen', () => {
  it('renders the wallet screen with the correct elements', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <AssetSwapsContext.Provider value={{ swapAvailable: true, swaps: [] } as any}>
          <Wallet />
        </AssetSwapsContext.Provider>
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
    expect(screen.getByText('Do more with your money')).toBeInTheDocument()
    expect(screen.queryByText('Borrow against your bitcoin')).not.toBeInTheDocument()
  })

  it('opens the bitcoin detail page from the bitcoin asset row', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <Wallet />
      </NavigationContext.Provider>,
    )

    await user.click(screen.getByTestId(/^asset-row-BTC-/))
    expect(navigate).toHaveBeenCalledWith(Pages.BitcoinDetail)
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

  it('collapses unverified assets into the Other assets basket, opening the administration detail', async () => {
    const user = userEvent.setup()
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
    expect(screen.getByText('1 unverified asset')).toBeInTheDocument()
    await user.click(screen.getByTestId('asset-row-other-assets'))
    await user.click(screen.getByTestId(/^asset-row-TKN-/))
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetDetail)
  })
})
