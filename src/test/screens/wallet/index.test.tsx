import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Wallet from '../../../screens/Wallet/Index'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { mockConfigContextValue, mockNavigationContextValue, mockWalletContextValue } from '../mocks'
import { ConfigContext } from '../../../providers/config'
import { WalletContext } from '../../../providers/wallet'

describe('Wallet screen', () => {
  it('renders the wallet screen with the correct elements', async () => {
    const user = userEvent.setup()
    const navigate = vi.fn()

    render(
      <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
        <Wallet />
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

  it('shows imported fiat account rows on the home asset list', () => {
    const chfAssetId = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd'

    render(
      <ConfigContext.Provider
        value={
          {
            ...mockConfigContextValue,
            config: { ...mockConfigContextValue.config, importedAssets: [chfAssetId] },
          } as any
        }
      >
        <WalletContext.Provider
          value={
            {
              ...mockWalletContextValue,
              assetBalances: [{ assetId: chfAssetId, amount: BigInt(1_000) }],
              assetMetadataCache: new Map([
                [
                  chfAssetId,
                  {
                    metadata: {
                      decimals: 2,
                      name: 'Swiss franc',
                      ticker: 'CHF',
                    },
                  },
                ],
              ]),
            } as any
          }
        >
          <Wallet />
        </WalletContext.Provider>
      </ConfigContext.Provider>,
    )

    expect(screen.getByText('CHF')).toBeInTheDocument()
    expect(screen.getByText('10.00 CHF')).toBeInTheDocument()
  })

  it('keeps non-fiat assets on the asset administration detail screen', async () => {
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

    await user.click(screen.getByTestId(/^asset-row-TKN-/))
    expect(navigate).toHaveBeenCalledWith(Pages.AppAssetDetail)
  })
})
