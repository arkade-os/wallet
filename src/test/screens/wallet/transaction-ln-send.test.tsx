import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Transaction from '../../../screens/Wallet/Transaction'
import { AspContext } from '../../../providers/asp'
import { FlowContext } from '../../../providers/flow'
import { LimitsContext } from '../../../providers/limits'
import { NavigationContext } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { readTransactionActivityMetadata, saveTransactionActivityMetadata } from '../../../lib/storage'
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
const getTransactionHistory = vi.hoisted(() => vi.fn())

vi.mock('@arkade-os/sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@arkade-os/sdk')>()),
  RestIndexerProvider: class {
    getVtxos = getVtxos
  },
}))

vi.mock('../../../lib/asp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/asp')>()),
  getInputsToSettle: async () => ({ inputs: [] }),
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

const lnSendTx = (lnSend: LnSendActivity): Tx => ({ ...sentTx, lnSend })

const withSvcWallet = { ...mockWalletContextValue, svcWallet: { getTransactionHistory } as never }

/** A wallet that can answer "is this one of my transactions?" */
const walletWith = (ownTxids: string[] = []) => {
  getTransactionHistory.mockResolvedValue(
    ownTxids.map((arkTxid) => ({ key: { arkTxid, boardingTxid: '', commitmentTxid: '' } })),
  )
  return withSvcWallet
}

/** A wallet whose history read fails, so ownership cannot be determined. */
const walletThatCannotAnswer = () => {
  getTransactionHistory.mockRejectedValue(new Error('history unavailable'))
  return withSvcWallet
}

const renderReceipt = (tx: Tx, wallet = mockWalletContextValue) =>
  render(
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <AspContext.Provider value={mockAspContextValue}>
        <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: tx }}>
          <WalletContext.Provider value={{ ...wallet, txs: [tx] }}>
            <LimitsContext.Provider value={mockLimitsContextValue}>
              <Transaction />
            </LimitsContext.Provider>
          </WalletContext.Provider>
        </FlowContext.Provider>
      </AspContext.Provider>
    </NavigationContext.Provider>,
  )

/** A funded covenant the indexer reports as spent by `spentTxid`. */
const spentCovenant = (spentTxid: string) => ({
  vtxos: [{ script: swapPkScript, txid: fundingTxid, virtualStatus: { state: 'spent' }, arkTxId: spentTxid }],
})

describe('Lightning send receipt', () => {
  beforeEach(() => {
    localStorage.clear()
    getVtxos.mockReset()
    getTransactionHistory.mockReset().mockResolvedValue([])
  })

  it('names the funding tx rather than showing one anonymous transaction id', async () => {
    // A wallet with no service worker cannot resolve the second leg, which is
    // also what an in-flight send looks like: the funding row stands alone.
    renderReceipt(lnSendTx({ swapPkScript }))

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    expect(screen.queryByText('Transaction ID')).not.toBeInTheDocument()
    // Nothing has spent the covenant, so claiming either outcome would be a lie.
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    expect(screen.queryByText('Refunded')).not.toBeInTheDocument()
  })

  it('shows both legs once the solver has claimed', async () => {
    renderReceipt(lnSendTx({ swapPkScript, spend: { spentTxid: 'claim-txid', outcome: 'completed' } }))

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    expect(screen.getByTestId('Completed')).toHaveTextContent('claim-txid')
  })

  it('calls the second leg a refund, not a cancellation, when the funds came back', async () => {
    // Nobody cancelled anything: the solver could not pay the invoice and the
    // covenant returned the money on its own.
    renderReceipt(lnSendTx({ swapPkScript, spend: { spentTxid: 'refund-txid', outcome: 'refunded' } }))

    expect(await screen.findByTestId('Refunded')).toHaveTextContent('refund-txid')
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument()
  })

  it('resolves the second leg on open and remembers it', async () => {
    getVtxos.mockResolvedValue(spentCovenant('claim-txid'))
    renderReceipt(lnSendTx({ swapPkScript }), walletWith())

    expect(await screen.findByTestId('Completed')).toHaveTextContent('claim-txid')
    expect(getVtxos).toHaveBeenCalledWith({ scripts: [swapPkScript] })
    expect(readTransactionActivityMetadata([fundingTxid])?.lnSend).toEqual({
      swapPkScript,
      spend: { spentTxid: 'claim-txid', outcome: 'completed' },
    })
  })

  it('reads the remembered answer instead of asking again', async () => {
    // The tx itself only carries the answer after a wallet reload has rebuilt
    // history from storage, so without this a revisit re-pays for the lookup —
    // and a swept covenant, which the indexer can no longer answer for, would
    // lose its outcome entirely.
    saveTransactionActivityMetadata(fundingTxid, {
      lnSend: { swapPkScript, spend: { spentTxid: 'claim-txid', outcome: 'completed' } },
    })
    renderReceipt(lnSendTx({ swapPkScript }), walletWith())

    expect(await screen.findByTestId('Completed')).toHaveTextContent('claim-txid')
    expect(getVtxos).not.toHaveBeenCalled()
  })

  it('reads a spend that is one of our own transactions as the refund', async () => {
    getVtxos.mockResolvedValue(spentCovenant('refund-txid'))
    renderReceipt(lnSendTx({ swapPkScript }), walletWith(['refund-txid']))

    expect(await screen.findByTestId('Refunded')).toHaveTextContent('refund-txid')
  })

  it('leaves the swap unresolved when the wallet cannot say whose the spend was', async () => {
    // A history read that failed must not read as "not ours" and be persisted
    // as a completed payment — that would report returned money as paid.
    getVtxos.mockResolvedValue(spentCovenant('refund-txid'))
    renderReceipt(lnSendTx({ swapPkScript }), walletThatCannotAnswer())

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    await waitFor(() => expect(getTransactionHistory).toHaveBeenCalled())
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    expect(readTransactionActivityMetadata([fundingTxid])).toBeUndefined()
  })

  it('leaves the funding row alone when the indexer lookup fails', async () => {
    getVtxos.mockRejectedValue(new Error('indexer unreachable'))
    renderReceipt(lnSendTx({ swapPkScript }), walletWith())

    expect(await screen.findByTestId('Funded')).toHaveTextContent(fundingTxid)
    await waitFor(() => expect(getVtxos).toHaveBeenCalled())
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    // A failed lookup must not be mistaken for an answer worth keeping.
    expect(readTransactionActivityMetadata([fundingTxid])).toBeUndefined()
  })

  it('leaves an ordinary send showing its transaction id', async () => {
    renderReceipt(sentTx)

    expect(await screen.findByTestId('Transaction ID')).toHaveTextContent(fundingTxid)
    expect(screen.queryByText('Funded')).not.toBeInTheDocument()
    expect(getVtxos).not.toHaveBeenCalled()
  })
})
