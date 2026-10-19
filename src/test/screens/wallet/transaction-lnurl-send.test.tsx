import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Transaction from '../../../screens/Wallet/Transaction'
import { AspContext } from '../../../providers/asp'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import type { Tx } from '../../../lib/types'
import { mergeSentPayment, type SentPayment } from '@arkade-os/lnurl-client/arkade'
import { LNURL_SENDS_STORAGE_KEY } from '../../../lib/storageKeys'
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

const txid = 'ark-send-txid'

const sentTx: Tx = { ...mockTxInfo, amount: 5_000, boardingTxid: '', redeemTxid: txid, roundTxid: '', type: 'sent' }

const recordSent = (over: Partial<SentPayment> = {}): void => {
  const sent: SentPayment = {
    txid,
    target: 'alice@pay.example',
    railId: 'lnurl-arkade',
    amountSat: 5_000,
    feeSat: 0,
    createdAt: 0,
    ...over,
  }
  localStorage.setItem(LNURL_SENDS_STORAGE_KEY, JSON.stringify(mergeSentPayment([], sent)))
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

describe('LNURL send receiver confirmation', () => {
  beforeEach(() => {
    localStorage.clear()
    getVtxos.mockReset()
  })

  it('shows nothing while no confirmation has resolved yet', async () => {
    recordSent()
    renderReceipt(sentTx)

    expect(await screen.findByTestId('Transaction ID')).toHaveTextContent(txid)
    expect(screen.queryByText('Receiver confirmed')).not.toBeInTheDocument()
    expect(screen.queryByText('Not confirmed')).not.toBeInTheDocument()
  })

  it('shows the receiver confirmed once settlement resolved', async () => {
    recordSent({ receiverConfirmed: true })
    renderReceipt(sentTx)

    expect(await screen.findByText('Receiver confirmed')).toBeInTheDocument()
  })

  it('shows a not-confirmed notice on a deadline or transport failure', async () => {
    recordSent({ receiverConfirmed: false })
    renderReceipt(sentTx)

    expect(await screen.findByText('Not confirmed')).toBeInTheDocument()
  })

  it('shows nothing for an ordinary send with no lnurl record', async () => {
    renderReceipt(sentTx)

    expect(await screen.findByTestId('Transaction ID')).toHaveTextContent(txid)
    expect(screen.queryByText('Receiver confirmed')).not.toBeInTheDocument()
    expect(screen.queryByText('Not confirmed')).not.toBeInTheDocument()
  })
})
