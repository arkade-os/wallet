import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Transaction from '../../../screens/Wallet/Transaction'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { mockFlowContextValue, mockLimitsContextValue } from '../mocks'

describe('Transaction screen', () => {
  it('renders the settled transaction screen correctly', async () => {
    render(
      <FlowContext.Provider value={mockFlowContextValue}>
        <LimitsContext.Provider value={mockLimitsContextValue}>
          <Transaction />
        </LimitsContext.Provider>
      </FlowContext.Provider>,
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
    const subtext = 'Transaction preconfirmed. Funds will be non-reversible after settlement.'
    mockFlowContextValue.txInfo.settled = false
    render(
      <FlowContext.Provider value={mockFlowContextValue}>
        <LimitsContext.Provider value={mockLimitsContextValue}>
          <Transaction />
        </LimitsContext.Provider>
      </FlowContext.Provider>,
    )
    // top of the page
    expect(screen.getByText('Preconfirmed')).toBeInTheDocument()
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
})
