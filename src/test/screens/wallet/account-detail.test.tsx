import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AccountDetail from '../../../screens/Wallet/AccountDetail'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { FlowContext } from '../../../providers/flow'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { Currencies } from '../../../lib/types'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'

vi.mock('liveline', () => ({
  Liveline: () => <div data-testid='liveline-chart' />,
}))

describe('Account detail screen', () => {
  it('shows a USD account without exposing its underlying USDT asset', async () => {
    const sourceAssetId = 'usdt-asset'
    const navigate = vi.fn()
    const setSendInfo = vi.fn()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() })),
    )

    render(
      <ConfigContext.Provider
        value={{
          ...mockConfigContextValue,
          config: {
            ...mockConfigContextValue.config,
            currency: Currencies.USD,
            importedAssets: [sourceAssetId],
          },
        }}
      >
        <FiatContext.Provider value={mockFiatContextValue}>
          <FlowContext.Provider
            value={{
              ...mockFlowContextValue,
              assetInfo: { assetId: 'account:usd', supply: BigInt(0) },
              setSendInfo,
            }}
          >
            <NavigationContext.Provider value={{ ...mockNavigationContextValue, navigate }}>
              <WalletContext.Provider
                value={
                  {
                    ...mockWalletContextValue,
                    assetBalances: [{ assetId: sourceAssetId, amount: BigInt(10_000) }],
                    assetMetadataCache: new Map([
                      [
                        sourceAssetId,
                        {
                          metadata: {
                            decimals: 2,
                            icon: 'https://issuer.example/tether.svg',
                            name: 'Tether USD',
                            ticker: 'USDT',
                          },
                        },
                      ],
                    ]),
                    txs: [
                      {
                        ...mockTxInfo,
                        amount: 0,
                        assets: [{ assetId: sourceAssetId, amount: BigInt(2_500) }],
                      },
                    ],
                  } as any
                }
              >
                <AccountDetail />
              </WalletContext.Provider>
            </NavigationContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'USD' })).toBeInTheDocument()
    expect(screen.getByText('$1.00')).toBeInTheDocument()
    expect(screen.getByText('100.00 USD')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByTestId('liveline-chart')).toBeInTheDocument()
    expect(screen.queryByText('USDT')).not.toBeInTheDocument()
    expect(screen.queryByText('Tether USD')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(setSendInfo).toHaveBeenCalledWith(
        expect.objectContaining({ assets: [{ assetId: sourceAssetId, amount: BigInt(0) }] }),
      )
      expect(navigate).toHaveBeenCalledWith(Pages.SendForm)
    })
  })
})
