import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SendDetails from '../../../screens/Wallet/Send/Details'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'
import { Currencies } from '../../../lib/types'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext, type SendInfo } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { SwapsContext } from '../../../providers/swaps'
import { WalletContext } from '../../../providers/wallet'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockSvcWallet,
  mockSwapsContextValue,
  mockWalletContextValue,
} from '../mocks'

const metadata = { decimals: 2, name: 'Tether USD', ticker: 'USDT' }

describe('Send details amount hierarchy', () => {
  const renderSendDetails = (sendInfo: SendInfo) =>
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider
            value={{
              ...mockFiatContextValue,
              fromFiatAmount: (amount, currency) => (currency === Currencies.USD ? amount * 1_000 : 0),
              toFiatAmount: (satoshis, currency) => (currency === Currencies.EUR ? satoshis * 0.000875 : 0),
            }}
          >
            <AspContext.Provider
              value={{
                ...mockAspContextValue,
                aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' },
              }}
            >
              <SwapsContext.Provider value={mockSwapsContextValue}>
                <FlowContext.Provider value={{ ...mockFlowContextValue, sendInfo }}>
                  <WalletContext.Provider
                    value={{
                      ...mockWalletContextValue,
                      assetMetadataCache: new Map([
                        [
                          MUTINYNET_USDT_ASSET_ID,
                          {
                            assetId: MUTINYNET_USDT_ASSET_ID,
                            cachedAt: 0,
                            metadata,
                            supply: BigInt(1_000),
                          },
                        ],
                      ]),
                      isVerifiedAsset: (assetId) => assetId === MUTINYNET_USDT_ASSET_ID,
                      svcWallet: mockSvcWallet as any,
                    }}
                  >
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <SendDetails />
                    </LimitsContext.Provider>
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </SwapsContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

  it('shows the configured currency first and the USD account amount second', async () => {
    renderSendDetails({
      account: {
        amount: BigInt(200),
        assetId: MUTINYNET_USDT_ASSET_ID,
        balance: BigInt(1_000),
        decimals: 2,
        source: { assetId: MUTINYNET_USDT_ASSET_ID, balance: BigInt(1_000), decimals: 2 },
        ticker: 'USD',
      },
      arkAddress: 'tark1destination',
      assets: [{ assetId: MUTINYNET_USDT_ASSET_ID, amount: BigInt(200) }],
      satoshis: 0,
    })

    await waitFor(() => expect(screen.getByTestId('primary-amount')).toHaveTextContent('€1.75'))
    expect(screen.getByTestId('Asset amount')).toHaveTextContent('2.00 USD')
    expect(screen.getByTestId('Value')).toHaveTextContent('€1.75')
    expect(screen.queryByText(/USDT/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('Total')).not.toBeInTheDocument()
  })
})
