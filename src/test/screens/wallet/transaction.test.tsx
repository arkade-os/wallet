import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Transaction from '../../../screens/Wallet/Transaction'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockTxId,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'

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
    expect(await screen.findByText('0 SATS')).toBeInTheDocument()
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
    expect(screen.getByText('0 SATS')).toBeInTheDocument()
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
    expect(screen.getByText('0 SATS')).toBeInTheDocument()
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
    expect(screen.getByText('0 SATS')).toBeInTheDocument()
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
    expect(screen.getByText('0 SATS')).toBeInTheDocument()
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
    expect(screen.getByText('0 SATS')).toBeInTheDocument()
    // buttons should not be present
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
  })
})
