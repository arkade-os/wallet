import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionsList from '../../components/TransactionsList'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockTxId,
  mockWalletContextValue,
} from '../screens/mocks'

describe('TransactionsList', () => {
  it('does not infer a branded activity icon from an unverified asset ticker', () => {
    const assetId = 'spoofed-eur'
    const tx = {
      amount: 0,
      assets: [{ assetId, amount: BigInt(100_000) }],
      boardingTxid: '',
      createdAt: Math.floor(Date.now() / 1000),
      explorable: mockTxId,
      preconfirmed: false,
      redeemTxid: mockTxId,
      roundTxid: '',
      settled: true,
      type: 'received',
    }
    const { container } = render(
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <FlowContext.Provider value={mockFlowContextValue}>
            <NavigationContext.Provider value={mockNavigationContextValue}>
              <WalletContext.Provider
                value={{
                  ...mockWalletContextValue,
                  txs: [tx],
                  assetMetadataCache: new Map([
                    [
                      assetId,
                      {
                        assetId,
                        supply: BigInt(100_000),
                        cachedAt: Date.now(),
                        metadata: { decimals: 2, name: 'Fake euros', ticker: 'EUR' },
                      },
                    ],
                  ]),
                }}
              >
                <TransactionsList mode='static' />
              </WalletContext.Provider>
            </NavigationContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>,
    )

    expect(container.querySelector('.transaction-asset-logo')).not.toBeInTheDocument()
    expect(container.querySelector('.activity-row__amount')).toHaveTextContent('EUR')
  })

  it('does not infer branded swap-route icons from ticker strings', () => {
    const tx = {
      amount: 0,
      boardingTxid: '',
      createdAt: Math.floor(Date.now() / 1000),
      explorable: mockTxId,
      preconfirmed: false,
      prototypeSwap: { fromTicker: 'EUR', toTicker: 'USD' },
      redeemTxid: mockTxId,
      roundTxid: '',
      settled: true,
      type: 'swap',
    }
    const { container } = render(
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <FlowContext.Provider value={mockFlowContextValue}>
            <NavigationContext.Provider value={mockNavigationContextValue}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [tx] }}>
                <TransactionsList mode='static' />
              </WalletContext.Provider>
            </NavigationContext.Provider>
          </FlowContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>,
    )

    const routeIcon = container.querySelector('.activity-swap-route-icon')
    expect(routeIcon).toBeInTheDocument()
    expect(routeIcon?.querySelector('svg')).not.toBeInTheDocument()
    expect(routeIcon).toHaveTextContent('E')
    expect(routeIcon).toHaveTextContent('U')
  })
})
