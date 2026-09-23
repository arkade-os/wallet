import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Transaction from '../../../screens/Wallet/Transaction'
import { AspContext } from '../../../providers/asp'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import type { LnSendActivity, Tx } from '../../../lib/types'
import {
  mockAspContextValue,
  mockFlowContextValue,
  mockLimitsContextValue,
  mockNavigationContextValue,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'

const getVtxos = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
  },
}))

const swapPkScript = `5120${'ab'.repeat(32)}`
const fundingTxid = 'funding-txid'

const sentTx: Tx = {
  ...mockTxInfo,
  amount: 5000,
  boardingTxid: '',
  destination: 'lnbc5u1p482...',
  explorable: undefined,
  redeemTxid: fundingTxid,
  roundTxid: '',
  type: 'sent',
}

/** A row as `activitiesToTxs` builds it from a swap record. */
const lnSwapTx = (lnSwap: Tx['lnSwap']): Tx => ({ ...sentTx, lnSwap: { fundingTxid, ...lnSwap } })

/** A row from before the records existed, carrying its old localStorage half. */
const legacyTx = (lnSend: LnSendActivity): Tx => ({ ...sentTx, lnSend })

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

describe('Lightning send receipt', () => {
  beforeEach(() => {
    localStorage.clear()
    getVtxos.mockReset()
  })

  it('names the funding tx rather than showing one anonymous transaction id', async () => {
    renderReceipt(lnSwapTx({ outcome: 'pending' }))

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    expect(screen.queryByText('Transaction ID')).not.toBeInTheDocument()
    // Nothing has spent the covenant, so claiming either outcome would be a lie.
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    expect(screen.queryByText('Refunded')).not.toBeInTheDocument()
  })

  it('shows both legs once the solver has claimed', async () => {
    renderReceipt(lnSwapTx({ outcome: 'settled', spendTxid: 'claim-txid' }))

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    expect(screen.getByTestId('Completed')).toHaveTextContent('claim-txid')
  })

  it('calls the second leg a refund, not a cancellation, when the funds came back', async () => {
    // Nobody cancelled anything: the solver could not pay the invoice and the
    // covenant returned the money.
    renderReceipt(lnSwapTx({ outcome: 'refunded', spendTxid: 'refund-txid' }))

    expect(await screen.findByTestId('Refunded')).toHaveTextContent('refund-txid')
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument()
  })

  it('asks the indexer nothing — the outcome is the swap manager’s, already recorded', async () => {
    // The regression this guards: the receipt used to resolve the spend itself
    // on open, from whichever screen was mounted. `RfqSwapManager` owns that
    // answer now, and a screen that re-asks would be a second resolver racing
    // the first.
    renderReceipt(lnSwapTx({ outcome: 'settled', spendTxid: 'claim-txid' }))

    expect(await screen.findByTestId('Completed')).toHaveTextContent('claim-txid')
    expect(getVtxos).not.toHaveBeenCalled()
  })

  it('still reads a send made before the records existed', async () => {
    // No migration: those sends kept their answer in localStorage, and the row
    // still carries it, so their receipts go on rendering.
    renderReceipt(legacyTx({ swapPkScript, spend: { spentTxid: 'claim-txid', outcome: 'completed' } }))

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    expect(screen.getByTestId('Completed')).toHaveTextContent('claim-txid')
    expect(getVtxos).not.toHaveBeenCalled()
  })

  it('leaves an ordinary send showing its transaction id', async () => {
    renderReceipt(sentTx)

    expect(await screen.findByTestId('Transaction ID')).toHaveTextContent(fundingTxid)
    expect(screen.queryByText('Funded')).not.toBeInTheDocument()
    expect(getVtxos).not.toHaveBeenCalled()
  })
})
