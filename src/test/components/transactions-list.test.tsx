import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TransactionsList from '../../components/TransactionsList'
import { ConfigContext } from '../../providers/config'
import { FiatContext } from '../../providers/fiat'
import { FlowContext } from '../../providers/flow'
import { NavigationContext } from '../../providers/navigation'
import { WalletContext } from '../../providers/wallet'
import { Currencies, Tx } from '../../lib/types'
import {
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../screens/mocks'

describe('TransactionsList', () => {
  it('shows one configured-unit amount for an arbitrary swap pair', () => {
    const swapTx: Tx = {
      amount: 0,
      boardingTxid: '',
      createdAt: 1_700_000_000,
      explorable: undefined,
      isPrototype: true,
      preconfirmed: false,
      prototypeSwap: {
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
      roundTxid: 'prototype-swap-placeholder',
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
})
