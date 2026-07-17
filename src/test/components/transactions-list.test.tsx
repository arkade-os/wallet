import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionsList from '../../components/TransactionsList'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { AspContext } from '../../providers/asp'
import { AssetsContext } from '../../providers/assets'
import { Currencies, Tx } from '../../lib/types'
import { MUTINYNET_DEPIX_ASSET_ID } from '../../lib/accountAssets'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../screens/mocks'

describe('TransactionsList', () => {
  it('formats designated account activity with the underlying asset decimals', () => {
    const tx: Tx = {
      amount: 330,
      boardingTxid: '',
      createdAt: 1_700_000_000,
      explorable: undefined,
      preconfirmed: false,
      redeemTxid: '',
      roundTxid: 'depix-send',
      settled: true,
      type: 'sent',
      assets: [{ assetId: MUTINYNET_DEPIX_ASSET_ID, amount: BigInt(-200_000_000_000) }],
    }

    render(
      <AspContext.Provider
        value={{ ...mockAspContextValue, aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' } } as any}
      >
        <AssetsContext.Provider value={{ isRegistered: () => true } as any}>
          <NavigationContext.Provider value={mockNavigationContextValue}>
            <ConfigContext.Provider value={mockConfigContextValue}>
              <FiatContext.Provider value={mockFiatContextValue}>
                <FlowContext.Provider value={mockFlowContextValue}>
                  <WalletContext.Provider
                    value={
                      {
                        ...mockWalletContextValue,
                        txs: [tx],
                        assetMetadataCache: new Map([
                          [
                            MUTINYNET_DEPIX_ASSET_ID,
                            { metadata: { decimals: 8, name: 'Decentralized Pix', ticker: 'DEPIX' } },
                          ],
                        ]),
                      } as any
                    }
                  >
                    <TransactionsList mode='static' />
                  </WalletContext.Provider>
                </FlowContext.Provider>
              </FiatContext.Provider>
            </ConfigContext.Provider>
          </NavigationContext.Provider>
        </AssetsContext.Provider>
      </AspContext.Provider>,
    )

    expect(screen.getByText('-2,000.00 BRL')).toBeInTheDocument()
    expect(screen.queryByText('-2,000,000,000.00 BRL')).not.toBeInTheDocument()
  })

  it('shows one configured-unit amount for an arbitrary swap pair', () => {
    const swapTx: Tx = {
      amount: 0,
      boardingTxid: '',
      createdAt: 1_700_000_000,
      explorable: undefined,
      preconfirmed: false,
      assetSwap: {
        fiatAmount: 100,
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        status: 'completed',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
      },
      redeemTxid: '',
      roundTxid: 'fill-txid',
      settled: true,
      type: 'swap',
    }
    const localConfigContextValue = {
      ...mockConfigContextValue,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD },
    }

    const { container } = render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={localConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <FlowContext.Provider value={mockFlowContextValue}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [swapTx] }}>
                <TransactionsList mode='static' />
              </WalletContext.Provider>
            </FlowContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('Swap')).toBeInTheDocument()
    expect(screen.getByText(/ALP to BET/)).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.queryByText(/123.45 ALP/)).not.toBeInTheDocument()
    expect(screen.queryByText(/67.89 BET/)).not.toBeInTheDocument()
    expect(container.querySelectorAll('.swap-route-icon__fallback')).toHaveLength(2)
  })

  it('falls back to the transaction amount when any asset lacks account pricing', () => {
    const tx: Tx = {
      amount: 330,
      boardingTxid: '',
      createdAt: 1_700_000_000,
      explorable: undefined,
      preconfirmed: false,
      redeemTxid: '',
      roundTxid: 'mixed-asset-transaction',
      settled: true,
      type: 'received',
      assets: [
        { assetId: 'usdt-asset', amount: BigInt(10_000) },
        { assetId: 'unknown-asset', amount: BigInt(50) },
      ],
    }
    const fiatContextValue = {
      ...mockFiatContextValue,
      fromFiatAmount: (amount: number) => amount * 100,
      toFiat: (satoshis?: number) => (satoshis ?? 0) / 100,
    }
    const walletContextValue = {
      ...mockWalletContextValue,
      txs: [tx],
      assetMetadataCache: new Map([
        [
          'usdt-asset',
          {
            metadata: {
              decimals: 2,
              name: 'Tether USD',
              ticker: 'USDT',
            },
          },
        ],
      ]),
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={fiatContextValue}>
            <FlowContext.Provider value={mockFlowContextValue}>
              <WalletContext.Provider value={walletContextValue as any}>
                <TransactionsList mode='static' />
              </WalletContext.Provider>
            </FlowContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('€3.30')).toBeInTheDocument()
    expect(screen.queryByText('€100.00')).not.toBeInTheDocument()
  })
})
