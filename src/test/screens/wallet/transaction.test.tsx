import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Transaction from '../../../screens/Wallet/Transaction'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import {
  mockAspContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockTxId,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'

describe('Transaction screen', () => {
  it('renders the settled transaction screen correctly', async () => {
    render(
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={mockFlowContextValue}>
          <LimitsContext.Provider value={mockLimitsContextValue}>
            <Transaction />
          </LimitsContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>,
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
    const title = 'Preconfirmed'
    const subtext = 'Transaction preconfirmed. Funds will be non-reversible after settlement.'

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
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={localFlowContextValue}>
          <WalletContext.Provider value={localWalletContextValue}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>,
    )
    // top of the page
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(subtext)).toBeInTheDocument()
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
    expect(await screen.findByText('Settle transaction')).toBeInTheDocument()
    expect(await screen.findByText('Add reminder')).toBeInTheDocument()
  })

  it('renders the unconfirmed boarding transaction screen correctly', async () => {
    const title = 'Unconfirmed'
    const subtext = 'Onchain transaction unconfirmed. Please wait for confirmation.'

    // unconfirmed boarding transaction
    const txInfo = { ...mockTxInfo, boardingTxId: mockTxId, settled: false, createdAt: 0 }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={localFlowContextValue}>
          <WalletContext.Provider value={localWalletContextValue}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>,
    )
    // top of the page
    expect(screen.getAllByText(title)).toHaveLength(3)
    expect(screen.getByText(subtext)).toBeInTheDocument()
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
    const title = 'Preconfirmed'
    const subtext = 'Transaction preconfirmed. Funds will be non-reversible after settlement.'

    // confirmed boarding transaction
    const txInfo = { ...mockTxInfo, boardingTxId: mockTxId, settled: false }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={localFlowContextValue}>
          <WalletContext.Provider value={localWalletContextValue}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>,
    )
    // top of the page
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(subtext)).toBeInTheDocument()
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
    expect(screen.queryByText('Settle transaction')).toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).toBeInTheDocument()
  })

  it('renders the preconfirmed ark transaction screen correctly', async () => {
    const title = 'Preconfirmed'
    const subtext = 'Transaction preconfirmed. Funds will be non-reversible after settlement.'

    // preconfirmed ark transaction
    const txInfo = { ...mockTxInfo, arkTxId: mockTxId, settled: false }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }

    render(
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={localFlowContextValue}>
          <WalletContext.Provider value={localWalletContextValue}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>,
    )
    // top of the page
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(subtext)).toBeInTheDocument()
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
    expect(screen.queryByText('Settle transaction')).toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).toBeInTheDocument()
  })

  it('should hide buttons if total amount < dust', async () => {
    const title = 'Preconfirmed'
    const subtext = 'Transaction preconfirmed. Funds will be non-reversible after settlement.'
    const amount = 21
    const dust = BigInt(333)

    // preconfirmed ark transaction
    const txInfo = { ...mockTxInfo, amount, arkTxId: mockTxId, settled: false }
    const aspInfo = { ...mockAspContextValue.aspInfo, dust }
    const localFlowContextValue = { ...mockFlowContextValue, txInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [txInfo] }
    const localAspContextValue = { ...mockAspContextValue, aspInfo }

    render(
      <AspContext.Provider value={localAspContextValue}>
        <FlowContext.Provider value={localFlowContextValue}>
          <WalletContext.Provider value={localWalletContextValue}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>,
    )
    // top of the page
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(subtext)).toBeInTheDocument()
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
