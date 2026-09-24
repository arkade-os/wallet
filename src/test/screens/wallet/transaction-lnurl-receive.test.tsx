import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Transaction from '../../../screens/Wallet/Transaction'
import { AspContext } from '../../../providers/asp'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import type { Tx } from '../../../lib/types'
import {
  mockAspContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockWalletContextValue,
} from '../mocks'

const receivedTx: Tx = {
  amount: 5_000,
  boardingTxid: '',
  createdAt: 1_700_000_000,
  explorable: undefined,
  preconfirmed: false,
  redeemTxid: 'claim-txid',
  roundTxid: '',
  settled: true,
  type: 'received',
  lnurl: { address: 'alice@lnurl.example', rail: 'lightning' },
}

const renderReceipt = (tx: Tx) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: tx }}>
          <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [tx] }}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

describe('LNURL receive detail', () => {
  it('shows the address it arrived at and the rail, never a payer', async () => {
    renderReceipt(receivedTx)

    expect(await screen.findByTestId('Received at')).toHaveTextContent('alice@lnurl.example')
    expect(screen.getByTestId('Rail')).toHaveTextContent('lightning')
    expect(screen.queryByTestId('Paid by')).not.toBeInTheDocument()
  })

  it('shows only the rail for a nameless receive', async () => {
    renderReceipt({ ...receivedTx, lnurl: { rail: 'arkade' } })

    expect(await screen.findByTestId('Rail')).toHaveTextContent('arkade')
    expect(screen.queryByTestId('Received at')).not.toBeInTheDocument()
  })

  it('shows neither row for an ordinary receive with no lnurl record', async () => {
    renderReceipt({ ...receivedTx, lnurl: undefined })

    expect(await screen.findByTestId('Transaction ID')).toHaveTextContent('claim-txid')
    expect(screen.queryByTestId('Received at')).not.toBeInTheDocument()
    expect(screen.queryByTestId('Rail')).not.toBeInTheDocument()
  })
})
