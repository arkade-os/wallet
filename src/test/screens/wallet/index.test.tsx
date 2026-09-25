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
  it('does not use swap history to enter an unavailable swap composer', async () => {
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <AssetSwapsContext.Provider value={{ swapAvailable: false, swaps: [{ id: 'pending-swap' }] } as any}>
          <Wallet />
        </AssetSwapsContext.Provider>
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
