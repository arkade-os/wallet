import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Transaction from '../../../screens/Wallet/Transaction'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockConfigContextValue,
  mockFiatContextValue,
  mockFlowContextValue,
  mockIssuanceTxInfo,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockTxId,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { Currencies } from '../../../lib/types'

describe('Transaction screen', () => {
  it('renders the settled transaction screen correctly', async () => {
    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={mockFlowContextValue}>
            <WalletContext.Provider value={mockWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('When')).toBeInTheDocument()
    // right side of the table
    expect(await screen.findByText('Received')).toBeInTheDocument()
    expect(await screen.findByText('0 BTC')).toBeInTheDocument()
  })

  it('renders the preconfirmed transaction screen correctly', async () => {
    // unsettled transaction
    const localFlowContextValue = {
      ...mockFlowContextValue,
      txInfo: { ...mockFlowContextValue.txInfo, settled: false },
    }

    const localWalletContextValue = {
      ...mockWalletContextValue,
      txs: [localFlowContextValue.txInfo],
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('When')).toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
    // buttons
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
  })

  it('renders the unconfirmed boarding transaction screen correctly', async () => {
    // unconfirmed boarding transaction
    const txInfo = { ...mockTxInfo, boardingTxid: mockTxId, settled: false, createdAt: 0, amount: 21000 }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('When')).toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
    // buttons should not be present
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
  })

  it('renders the confirmed boarding transaction screen correctly', async () => {
    // confirmed boarding transaction
    const txInfo = { ...mockTxInfo, boardingTxid: mockTxId, settled: false }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('When')).toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
    // buttons should be present
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
  })

  it('renders the preconfirmed ark transaction screen correctly', async () => {
    // preconfirmed ark transaction
    const txInfo = { ...mockTxInfo, arkTxid: mockTxId, settled: false }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('When')).toBeInTheDocument()
    // right side of the table
    // expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
    // buttons should be present
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
  })

  it('should hide buttons if total amount < dust', async () => {
    const amount = 21

    // preconfirmed ark transaction
    const txInfo = { ...mockTxInfo, amount, arkTxid: mockTxId, settled: false }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.getByText('Direction')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('When')).toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
    // buttons should not be present
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
  })

  it('renders issuance transaction with correct direction and amounts', async () => {
    const localFlowContextValue = { ...mockFlowContextValue, txInfo: mockIssuanceTxInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [mockIssuanceTxInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    // Should show "Issuance" instead of "Sent"
    expect(screen.getByText('Issuance')).toBeInTheDocument()
    expect(screen.queryByText('Sent')).not.toBeInTheDocument()
  })

  it('renders burn transaction with correct direction', async () => {
    const mockBurnTxInfo = {
      ...mockIssuanceTxInfo,
      assets: [
        { assetId: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd', amount: BigInt(-5_000) },
      ],
    }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo: mockBurnTxInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [mockBurnTxInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider value={localWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    // Should show "Burn" instead of "Sent"
    expect(screen.getByText('Burn')).toBeInTheDocument()
    expect(screen.queryByText('Sent')).not.toBeInTheDocument()
  })

  it('renders a swap as an asset-pair receipt without send-only fields', () => {
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      isPrototype: true,
      prototypeSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        fiatAmount: 100,
        status: 'completed' as const,
      },
      roundTxid: 'prototype-swap-placeholder',
      settled: true,
      type: 'swap',
    }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo: swapTxInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [swapTxInfo] }
    const localConfigContextValue = {
      ...mockConfigContextValue,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD },
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={localConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={localFlowContextValue}>
                <WalletContext.Provider value={localWalletContextValue}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <Transaction />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'Swap' })).toBeInTheDocument()
    expect(screen.getByText('ALP to BET')).toBeInTheDocument()
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByTestId('From')).toHaveTextContent('123.45 ALP')
    expect(screen.getByTestId('To')).toHaveTextContent('67.89 BET')
    expect(screen.getAllByText('Completed')).toHaveLength(1)
    expect(screen.getByText('Asset swap')).toBeInTheDocument()
    expect(screen.getByTestId('Transaction ID')).toHaveTextContent('Not available yet')
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.queryByText('Amount')).not.toBeInTheDocument()
    expect(screen.getByTestId('Network fees')).toHaveTextContent('Not available yet')
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
  })

  it('masks swap asset amounts when balances are hidden', () => {
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      isPrototype: true,
      prototypeSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        fiatAmount: 100,
        status: 'completed' as const,
      },
      roundTxid: 'prototype-swap-placeholder',
      settled: true,
      type: 'swap',
    }
    const localConfigContextValue = {
      ...mockConfigContextValue,
      config: { ...mockConfigContextValue.config, currency: Currencies.USD, showBalance: false },
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={localConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: swapTxInfo }}>
                <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [swapTxInfo] }}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <Transaction />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByTestId('From')).toHaveTextContent('········ ALP')
    expect(screen.getByTestId('To')).toHaveTextContent('········ BET')
    expect(screen.queryByText('123.45 ALP')).not.toBeInTheDocument()
    expect(screen.queryByText('67.89 BET')).not.toBeInTheDocument()
  })
})
