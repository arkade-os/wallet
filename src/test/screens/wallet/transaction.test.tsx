import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaxiError } from '@arkade-taxi/client'
import Transaction from '../../../screens/Wallet/Transaction'
import { ReceiverClaimsContext } from '../../../providers/receiverClaims'
import { claimKey } from '../../../lib/receiverClaims'
import { PendingDirectTaxi, ReturnedDirectTaxi, type PendingTaxiRecord } from '../../../lib/directTaxiSend'
import type { TaxiActivity } from '../../../lib/taxiActivity'
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
  mockSvcWallet,
  mockTxInfo,
  mockWalletContextValue,
} from '../mocks'
import { AspContext } from '../../../providers/asp'
import { WalletContext } from '../../../providers/wallet'
import { NavigationContext } from '../../../providers/navigation'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { Currencies, Language, type Tx } from '../../../lib/types'
import { LanguageContext } from '../../../providers/language'
import { translate } from '../../../lib/i18n'
import type { CarrierActivity } from '../../../lib/carrierActivity'
import { AssetsContext } from '../../../providers/assets'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import type { WalletAssetSwap as AssetSwap } from '../../../lib/swapRepository'

const checkTaxiPayment = vi.hoisted(() => vi.fn())
vi.mock('../../../lib/directTaxiSend', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/directTaxiSend')>()),
  checkTaxiPayment,
}))

const FUNDING_TXID = '1'.repeat(64)

const pendingSwapTx = {
  ...mockTxInfo,
  amount: 0,
  boardingTxid: '',
  assetSwap: {
    fromAmount: BigInt(10_000),
    fromAssetId: 'btc',
    fromDecimals: 0,
    fromTicker: 'sats',
    toAmount: BigInt(500),
    toAssetId: 'asset-beta',
    toDecimals: 2,
    toTicker: 'BET',
    status: 'pending' as const,
    fundingTxid: FUNDING_TXID,
  },
  preconfirmed: true,
  redeemTxid: FUNDING_TXID,
  roundTxid: '',
  settled: false,
  type: 'swap',
}

const pendingSwap: AssetSwap = {
  id: FUNDING_TXID,
  fromAsset: 'btc',
  toAsset: 'asset-beta',
  fromAmount: '10000',
  toAmount: '500',
  swapAddress: 'tark1q...',
  swapPkScript: `5120${'ab'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: FUNDING_TXID,
  status: 'pending',
  createdAt: 1,
}

function CancellationHarness({
  cancel,
  reconciled = false,
}: {
  cancel: (id: string) => Promise<void>
  reconciled?: boolean
}) {
  const [swaps, setSwaps] = useState([pendingSwap])
  const cancelledSwap = { ...pendingSwap, status: 'cancelled' as const, spentTxid: 'cancel-txid' }
  const cancelSwap = async (id: string) => {
    await cancel(id)
    setSwaps([cancelledSwap])
  }

  return (
    <NavigationContext.Provider value={mockNavigationContextValue}>
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={mockFiatContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: pendingSwapTx }}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [pendingSwapTx] } as any}>
                <AssetSwapsContext.Provider value={{ swaps: reconciled ? [cancelledSwap] : swaps, cancelSwap } as any}>
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <Transaction />
                  </LimitsContext.Provider>
                </AssetSwapsContext.Provider>
              </WalletContext.Provider>
            </FlowContext.Provider>
          </AspContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>
    </NavigationContext.Provider>
  )
}

describe('Transaction screen', () => {
  it('selects a prepared swap by stable history identity without enabling cancellation', () => {
    const txInfo = {
      ...pendingSwapTx,
      historyKey: 'swap:intent-2',
      assetSwap: { ...pendingSwapTx.assetSwap, fundingTxid: '', status: 'completed' as const },
      redeemTxid: '',
      settled: true,
    }
    const swaps = [
      { ...pendingSwap, id: 'intent-1', fundingTxid: '', status: 'fulfilled' as const },
      { ...pendingSwap, id: 'intent-2', fundingTxid: '', status: 'pending' as const },
    ]

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
                <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [txInfo] } as any}>
                  <AssetSwapsContext.Provider value={{ swaps } as any}>
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <Transaction />
                    </LimitsContext.Provider>
                  </AssetSwapsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByTestId('Status')).toHaveTextContent('Swap pending')
    expect(screen.queryByRole('button', { name: /cancel swap/i })).not.toBeInTheDocument()
  })

  it('confirms a pending swap cancellation and stays on the updated receipt', async () => {
    let finishCancel: () => void = () => {}
    const cancel = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCancel = resolve
        }),
    )
    render(<CancellationHarness cancel={cancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel swap' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByRole('heading', { name: 'Cancel swap?' })).toBeInTheDocument()
    expect(within(dialog).getByText(/return its locked funds to your wallet/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel swap' }))
    expect(cancel).toHaveBeenCalledWith(FUNDING_TXID)
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled()

    await act(async () => finishCancel())

    await waitFor(() => expect(screen.queryByRole('button', { name: /cancel swap/i })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Swap' })).toBeInTheDocument()
    expect(screen.getByTestId('Status')).toHaveTextContent('Cancelled')
    expect(screen.getByTestId('Cancelled')).toHaveTextContent('cancel-txid')
  })

  it('surfaces a failed cancellation and offers a retry', async () => {
    const cancel = vi.fn().mockRejectedValue(new Error('Cancellation unavailable'))
    render(<CancellationHarness cancel={cancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel swap' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel swap' }))

    expect(await screen.findByText('Cancellation unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry cancel' })).toBeInTheDocument()
  })

  it('clears a cancellation error when reconciliation reaches a terminal state', async () => {
    const cancel = vi.fn().mockRejectedValue(new Error('Cancellation status unknown'))
    const view = render(<CancellationHarness cancel={cancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel swap' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel swap' }))
    expect(await screen.findByText('Cancellation status unknown')).toBeInTheDocument()

    view.rerender(<CancellationHarness cancel={cancel} reconciled />)

    expect(screen.queryByText('Cancellation status unknown')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel swap/i })).not.toBeInTheDocument()
    expect(screen.getByTestId('Status')).toHaveTextContent('Cancelled')
  })

  it('labels an issuance with the exact action and hides the direction row', async () => {
    const localFlowContextValue = { ...mockFlowContextValue, txInfo: mockIssuanceTxInfo }
    const localWalletContextValue = { ...mockWalletContextValue, txs: [mockIssuanceTxInfo] }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={localFlowContextValue}>
            <WalletContext.Provider
              value={{ ...localWalletContextValue, isVerifiedAsset: (id: string) => id === MUTINYNET_USDT_ASSET_ID }}
            >
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('Amount issued')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByTestId('Total')).toHaveTextContent('0.0001')
  })

  it('labels a unilateral exit and links it to the block explorer, not to Arkade', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const exitTxInfo = {
      amount: 5_000,
      boardingTxid: '',
      createdAt: 1_700_090_000,
      explorable: 'exit-txid',
      networkFee: 0,
      preconfirmed: false,
      redeemTxid: 'exit-txid',
      roundTxid: '',
      settled: true,
      type: 'exit',
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <ConfigContext.Provider value={mockConfigContextValue}>
            <FiatContext.Provider value={mockFiatContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: exitTxInfo }}>
                <WalletContext.Provider
                  value={
                    {
                      ...mockWalletContextValue,
                      txs: [exitTxInfo],
                      wallet: { ...mockWalletContextValue.wallet, network: 'regtest' },
                    } as any
                  }
                >
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <Transaction />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </FiatContext.Provider>
          </ConfigContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('Amount exited')).toBeInTheDocument()
    // no Ark fee: the exit's real cost went to miners across the exit branch
    expect(screen.getByTestId('Network fees')).toHaveTextContent('0')
    // an exit is settled, so the receipt must not offer to settle it again
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()

    const row = document.getElementById('Transaction ID') as HTMLElement
    await userEvent.click(row.querySelector('.table-row__external') as HTMLElement)

    // the exit tx is on the chain — the vmempool explorer (:7080) never saw it
    expect(open).toHaveBeenCalledWith('http://localhost:5000/tx/exit-txid', '_blank', 'noreferrer')
    open.mockRestore()
  })

  it('labels a burn with the exact action and hides the direction row', async () => {
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
            <WalletContext.Provider
              value={{ ...localWalletContextValue, isVerifiedAsset: (id: string) => id === MUTINYNET_USDT_ASSET_ID }}
            >
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('Amount burned')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
  })

  it('labels a persisted reissue with the exact action', () => {
    const txInfo = { ...mockIssuanceTxInfo, assetAction: 'reissued' as const }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
            <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [txInfo] }}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('Amount reissued')).toBeInTheDocument()
  })

  it('renders a swap as an asset-pair receipt without send-only fields', () => {
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      assetSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        fiatAmount: 100,
        feeBps: 30,
        status: 'completed' as const,
        fundingTxid: 'funding-txid',
        fillTxid: 'fill-txid',
      },
      roundTxid: 'fill-txid',
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
                <WalletContext.Provider
                  value={{
                    ...localWalletContextValue,
                    isVerifiedAsset: (id: string) => id === MUTINYNET_USDT_ASSET_ID,
                  }}
                >
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
    expect(screen.getByTestId('Swap from')).toHaveTextContent('123.45 ALP')
    expect(screen.getByTestId('Swap to')).toHaveTextContent('68.094 BET')
    expect(screen.getByTestId('Status')).toHaveTextContent('Completed')
    expect(screen.queryByTestId('Type')).not.toBeInTheDocument()
    expect(screen.getByTestId('Funded')).toHaveTextContent('funding-txid')
    expect(screen.getByTestId('Completed')).toHaveTextContent('fill-txid')
    expect(screen.getByTestId('From asset ID (unverified)')).toHaveTextContent('asset-alpha')
    expect(screen.getByTestId('To asset ID (unverified)')).toHaveTextContent('asset-beta')
    expect(screen.queryByTestId('Transaction ID')).not.toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.queryByText('Amount')).not.toBeInTheDocument()
    // the rate is pre-fee like the live composer's Rate row — the gross
    // 68.094 BET over 123.45 ALP, not the net 67.89-derived 0.5499
    expect(screen.getByTestId('Price rate')).toHaveTextContent('1 ALP = 0.55159174')
    expect(screen.getByTestId('Network fees')).toHaveTextContent('$0.00')
    // the fee is shown in the receive asset (like the live composer), not a
    // bare percentage — 67.89 BET received net of a 0.30% fee is a 0.204 BET fee
    expect(screen.getByTestId('Swap fees')).toHaveTextContent('0.204 BET')
    expect(screen.getByTestId('Total received')).toHaveTextContent('67.89 BET')
  })

  it('discloses bought vs borrowed sats on a recycle receipt, and the fare apart', () => {
    const recycle: CarrierActivity = {
      version: 1,
      mode: 'recycle',
      physicalSats: '330',
      loanSats: '329',
      purchasedSats: '1',
      receiptSats: '1',
      serviceFareSats: '0',
      taxi: { transferId: 'advance-1' },
      state: 'claimable',
      txids: ['3'.repeat(64)],
    } as const
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      assetSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        status: 'completed' as const,
        fundingTxid: 'funding-txid',
        fillTxid: 'fill-txid',
      },
      carrier: recycle,
      carrierMembers: [{ txid: recycle.txids[0], type: 'received' as const }],
      roundTxid: 'fill-txid',
      settled: true,
      type: 'swap',
    }

    const receipt = (
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
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
      </NavigationContext.Provider>
    )
    const view = render(receipt)

    // 329 borrowed is never shown as bought; the 1 bought is the reserve
    expect(screen.getByTestId('Carrier sats')).toHaveTextContent('Borrowed 329 sats')
    expect(screen.getByTestId('Purchased sats')).toHaveTextContent('1 sat (receipt reserve)')
    expect(screen.getByTestId('Taxi service fee')).toHaveTextContent('0 sats')
    expect(screen.getByTestId('Delivery')).toHaveTextContent('Claimable')
    // the original swap identity is untouched by any of this
    expect(screen.getByTestId('Funded')).toHaveTextContent('funding-txid')
    view.rerender(
      <LanguageContext.Provider
        value={{ language: Language.Spanish, t: (key, params) => translate(Language.Spanish, key, params) }}
      >
        {receipt}
      </LanguageContext.Provider>,
    )
    expect(screen.getByTestId('Sats portadores')).toHaveTextContent('En préstamo: 329 sats')
    expect(screen.getByTestId('Sats comprados')).toHaveTextContent('1 sat (reserva del recibo)')
    expect(screen.getByTestId('Entrega')).toHaveTextContent('Reclamable')
    expect(screen.getByTestId('Transacción relacionada')).toHaveTextContent('33333333...33333333')
  })

  it('links canonical related transactions once without guessing their roles', async () => {
    const fundingTxid = '1'.repeat(64)
    const fillTxid = '2'.repeat(64)
    const relatedTxid = '3'.repeat(64)
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const txInfo = {
      ...pendingSwapTx,
      assetSwap: {
        ...pendingSwapTx.assetSwap,
        fundingTxid,
        fillTxid,
        status: 'completed' as const,
      },
      carrierMembers: [
        { txid: fundingTxid, type: 'sent' },
        { txid: fillTxid, type: 'received' },
        { txid: relatedTxid, type: 'received' },
        { txid: relatedTxid, type: 'received' },
        { txid: 'not-a-txid', type: 'received' },
      ],
      redeemTxid: fillTxid,
      settled: true,
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
                <WalletContext.Provider
                  value={
                    {
                      ...mockWalletContextValue,
                      txs: [txInfo],
                      wallet: { ...mockWalletContextValue.wallet, network: 'regtest' },
                    } as any
                  }
                >
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

    expect(screen.getAllByTestId(/Related transaction/)).toHaveLength(1)
    expect(screen.getByTestId('Related transaction')).toHaveTextContent('33333333...33333333')
    expect(screen.queryByText(/claim transaction|recovery transaction/i)).not.toBeInTheDocument()

    const row = document.getElementById('Related transaction') as HTMLElement
    await userEvent.click(row.querySelector('.table-row__external') as HTMLElement)
    expect(open).toHaveBeenCalledWith(`http://localhost:7080/tx/${relatedTxid}`, '_blank', 'noreferrer')
    open.mockRestore()
  })

  it('keeps a non-swap action and amount while linking its related transaction once', async () => {
    const primaryTxid = '4'.repeat(64)
    const relatedTxid = '5'.repeat(64)
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const txInfo = {
      ...mockTxInfo,
      amount: 1_234,
      boardingTxid: '',
      carrierMembers: [
        { txid: primaryTxid, type: 'received' },
        { txid: relatedTxid, type: 'received' },
        { txid: relatedTxid, type: 'received' },
      ],
      redeemTxid: primaryTxid,
      type: 'received',
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider
          value={{
            ...mockConfigContextValue,
            config: { ...mockConfigContextValue.config, currency: Currencies.USD },
          }}
        >
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
                <WalletContext.Provider
                  value={
                    {
                      ...mockWalletContextValue,
                      txs: [txInfo],
                      wallet: { ...mockWalletContextValue.wallet, network: 'regtest' },
                    } as any
                  }
                >
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

    expect(screen.getByText('Amount received')).toBeInTheDocument()
    expect(screen.getByTestId('primary-amount')).toHaveTextContent('$1,234.00')
    expect(screen.getAllByTestId(/Related transaction/)).toHaveLength(1)
    expect(screen.getByTestId('Related transaction')).toHaveTextContent('55555555...55555555')

    const row = document.getElementById('Related transaction') as HTMLElement
    await userEvent.click(row.querySelector('.table-row__external') as HTMLElement)
    expect(open).toHaveBeenCalledWith(`http://localhost:7080/tx/${relatedTxid}`, '_blank', 'noreferrer')
    open.mockRestore()
  })

  it('discloses a whole carrier purchase without claiming a loan', () => {
    const purchase: CarrierActivity = {
      version: 1,
      mode: 'purchase',
      physicalSats: '330',
      loanSats: '0',
      purchasedSats: '330',
      receiptSats: '0',
      serviceFareSats: '0',
      state: 'claimed',
      txids: ['4'.repeat(64)],
    } as const
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      assetSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        status: 'completed' as const,
        fundingTxid: 'funding-txid',
        fillTxid: 'fill-txid',
      },
      carrier: purchase,
      roundTxid: 'fill-txid',
      settled: true,
      type: 'swap',
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
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

    expect(screen.getByTestId('Carrier sats purchased')).toHaveTextContent('330 sats')
    expect(screen.queryByTestId('Purchased sats')).not.toBeInTheDocument()
    expect(screen.queryByTestId('Carrier sats')).not.toBeInTheDocument()
    expect(screen.queryByTestId('Taxi service fee')).not.toBeInTheDocument()
    expect(screen.queryByText(/Taxi/)).not.toBeInTheDocument()
    expect(screen.getByTestId('Delivery')).toHaveTextContent('Claimed')
  })

  it('shows a zero swap fee and reconciles it with the total received', () => {
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      assetSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        feeBps: 0,
        status: 'completed' as const,
      },
      roundTxid: 'fill-txid',
      settled: true,
      type: 'swap',
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: swapTxInfo }}>
            <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [swapTxInfo] }}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByTestId('Swap to')).toHaveTextContent('67.89 BET')
    expect(screen.getByTestId('Swap fees')).toHaveTextContent('0 BET')
    expect(screen.getByTestId('Total received')).toHaveTextContent('67.89 BET')
  })

  it('keeps the Swap to row for restored swaps without a backfilled fee rate', () => {
    // a restore scan with an unreachable market card leaves feeBps undefined:
    // the gross/fee reconciliation is impossible, but the receipt must still
    // show what was received rather than dropping the Swap to row
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      assetSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        status: 'completed' as const,
      },
      roundTxid: 'fill-txid',
      settled: true,
      type: 'swap',
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo: swapTxInfo }}>
            <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [swapTxInfo] }}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByTestId('Swap to')).toHaveTextContent('67.89 BET')
    expect(screen.getByTestId('Total received')).toHaveTextContent('67.89 BET')
    expect(screen.queryByTestId('Swap fees')).not.toBeInTheDocument()
  })

  it('masks swap asset amounts when balances are hidden', () => {
    const carrier: CarrierActivity = {
      version: 1,
      mode: 'recycle',
      physicalSats: '330',
      loanSats: '329',
      purchasedSats: '1',
      receiptSats: '1',
      serviceFareSats: '0',
      taxi: { transferId: 'advance-1' },
      state: 'claimable',
      txids: ['3'.repeat(64)],
    }
    const swapTxInfo = {
      ...mockTxInfo,
      amount: 0,
      boardingTxid: '',
      assetSwap: {
        fromAmount: BigInt(12_345),
        fromAssetId: 'asset-alpha',
        fromDecimals: 2,
        fromTicker: 'ALP',
        toAmount: BigInt(67_890),
        toAssetId: 'asset-beta',
        toDecimals: 3,
        toTicker: 'BET',
        fiatAmount: 100,
        feeBps: 30,
        status: 'completed' as const,
      },
      carrier,
      roundTxid: 'fill-txid',
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

    expect(screen.getByTestId('Swap from')).toHaveTextContent('········ ALP')
    expect(screen.getByTestId('Swap to')).toHaveTextContent('········ BET')
    expect(screen.getByTestId('Swap fees')).toHaveTextContent('········ BET')
    expect(screen.getByTestId('Total received')).toHaveTextContent('········ BET')
    expect(screen.getByTestId('Carrier sats')).toHaveTextContent('Borrowed ········ sats')
    expect(screen.getByTestId('Purchased sats')).toHaveTextContent('········ (receipt reserve)')
    expect(screen.getByTestId('Taxi service fee')).toHaveTextContent('········ sats')
    expect(screen.getByTestId('Delivery')).toHaveTextContent('Claimable')
    expect(screen.queryByText('123.45 ALP')).not.toBeInTheDocument()
    expect(screen.queryByText('67.89 BET')).not.toBeInTheDocument()
    expect(screen.queryByText('0.204 BET')).not.toBeInTheDocument()
    expect(screen.queryByText(/329|1 sat|0 sats/)).not.toBeInTheDocument()
  })

  it('uses the persisted wallet-facing tickers in swap details', () => {
    const txInfo = {
      ...mockTxInfo,
      type: 'swap',
      assetSwap: {
        fromTicker: 'USD',
        toTicker: 'BRL',
        status: 'completed' as const,
      },
    }

    render(
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <AspContext.Provider value={mockAspContextValue}>
          <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
            <WalletContext.Provider value={mockWalletContextValue}>
              <LimitsContext.Provider value={mockLimitsContextValue}>
                <Transaction />
              </LimitsContext.Provider>
            </WalletContext.Provider>
          </FlowContext.Provider>
        </AspContext.Provider>
      </NavigationContext.Provider>,
    )

    expect(screen.getByText('USD to BRL')).toBeInTheDocument()
    expect(screen.queryByText(/USDT|DEPIX/)).not.toBeInTheDocument()
  })

  it.each([
    {
      assetAmount: BigInt(10_000),
      assetLabel: '100.00 USD',
      direction: 'Received',
      type: 'received',
    },
    {
      assetAmount: BigInt(-10_000),
      assetLabel: '100.00 USD',
      direction: 'Sent',
      type: 'sent',
    },
  ])(
    'values a $direction USD transaction from its absolute account amount instead of its bitcoin dust amount',
    ({ assetAmount, assetLabel, direction, type }) => {
      const assetId = MUTINYNET_USDT_ASSET_ID
      const txInfo = {
        ...mockTxInfo,
        amount: 330,
        assets: [{ assetId, amount: assetAmount }],
        boardingTxid: '',
        destination: type === 'sent' ? 'tark1destination' : undefined,
        type,
      }
      const walletContextValue = {
        ...mockWalletContextValue,
        txs: [txInfo],
        assetMetadataCache: new Map([
          [
            assetId,
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
      const fiatContextValue = {
        ...mockFiatContextValue,
        fromFiatAmount: (amount: number) => amount * 100,
        toFiat: (satoshis?: number) => (satoshis ?? 0) / 100,
        toFiatAmount: (satoshis: number) => satoshis / 100,
      }

      render(
        <ConfigContext.Provider
          value={{
            ...mockConfigContextValue,
            config: { ...mockConfigContextValue.config, currency: Currencies.USD },
          }}
        >
          <FiatContext.Provider value={fiatContextValue}>
            <NavigationContext.Provider value={mockNavigationContextValue}>
              <AspContext.Provider
                value={
                  {
                    ...mockAspContextValue,
                    aspInfo: { ...mockAspContextValue.aspInfo, network: 'mutinynet' },
                  } as any
                }
              >
                <AssetsContext.Provider value={{ isRegistered: (id) => id === MUTINYNET_USDT_ASSET_ID }}>
                  <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
                    <WalletContext.Provider
                      value={
                        {
                          ...walletContextValue,
                          isVerifiedAsset: (id: string) => id === MUTINYNET_USDT_ASSET_ID,
                        } as any
                      }
                    >
                      <LimitsContext.Provider value={mockLimitsContextValue}>
                        <Transaction />
                      </LimitsContext.Provider>
                    </WalletContext.Provider>
                  </FlowContext.Provider>
                </AssetsContext.Provider>
              </AspContext.Provider>
            </NavigationContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>,
      )

      expect(screen.getByText(`Amount ${direction.toLowerCase()}`)).toBeInTheDocument()
      expect(screen.getByTestId('primary-amount')).toHaveTextContent('$100.00')
      expect(screen.getByTestId('Asset amount')).toHaveTextContent(assetLabel)
      expect(screen.getByTestId('Value')).toHaveTextContent('$100.00')
      expect(screen.getByTestId('Total')).toHaveTextContent(assetLabel)
      expect(screen.getByTestId('Asset ID')).toHaveTextContent(/^f121ac9b765.*cb9791a0000$/)
      expect(screen.queryByTestId('Direction')).not.toBeInTheDocument()
      expect(screen.queryByTestId('Type')).not.toBeInTheDocument()
      expect(screen.queryByTestId('When')).not.toBeInTheDocument()
      if (type === 'sent') {
        expect(screen.getByTestId('Destination')).toHaveTextContent('tark1destination')
      } else {
        expect(screen.queryByTestId('Destination')).not.toBeInTheDocument()
      }
      expect(screen.queryByText('Tether USD')).not.toBeInTheDocument()
    },
  )

  it('shows the gross sent amount with the persisted network fee on its own row', () => {
    // the headline is the full debit (fee included) — the e2e suite pins the
    // same convention — while the fee row surfaces the persisted networkFee
    const txInfo = {
      ...mockTxInfo,
      amount: 10_000,
      boardingTxid: '',
      redeemTxid: 'send-txid',
      networkFee: 500,
      settled: true,
      type: 'sent',
    }

    render(
      <ConfigContext.Provider value={{ ...mockConfigContextValue, useFiat: false }}>
        <NavigationContext.Provider value={mockNavigationContextValue}>
          <AspContext.Provider value={mockAspContextValue}>
            <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
              <WalletContext.Provider value={{ ...mockWalletContextValue, txs: [txInfo] }}>
                <LimitsContext.Provider value={mockLimitsContextValue}>
                  <Transaction />
                </LimitsContext.Provider>
              </WalletContext.Provider>
            </FlowContext.Provider>
          </AspContext.Provider>
        </NavigationContext.Provider>
      </ConfigContext.Provider>,
    )

    expect(screen.getByTestId('Asset amount')).toHaveTextContent('0.00010000 BTC')
    expect(screen.getByTestId('Network fees')).toHaveTextContent('0.00000500 BTC')
  })

  it('shows each raw total and asset ID when a mixed asset cannot be valued as an account', () => {
    const txInfo = {
      ...mockTxInfo,
      amount: 330,
      assets: [
        { assetId: 'usdt-asset', amount: BigInt(10_000) },
        { assetId: 'unknown-asset', amount: BigInt(50) },
      ],
      type: 'received',
    }
    const walletContextValue = {
      ...mockWalletContextValue,
      txs: [txInfo],
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
    const fiatContextValue = {
      ...mockFiatContextValue,
      fromFiatAmount: (amount: number) => amount * 100,
      toFiat: (satoshis?: number) => (satoshis ?? 0) / 100,
    }

    render(
      <ConfigContext.Provider value={mockConfigContextValue}>
        <FiatContext.Provider value={fiatContextValue}>
          <NavigationContext.Provider value={mockNavigationContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
                <WalletContext.Provider
                  value={
                    { ...walletContextValue, isVerifiedAsset: (id: string) => id === MUTINYNET_USDT_ASSET_ID } as any
                  }
                >
                  <LimitsContext.Provider value={mockLimitsContextValue}>
                    <Transaction />
                  </LimitsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </NavigationContext.Provider>
        </FiatContext.Provider>
      </ConfigContext.Provider>,
    )

    // The carrier dust must not read as a price, but each actual asset amount
    // remains visible and independently identified.
    expect(screen.queryByTestId('Amount')).not.toBeInTheDocument()
    expect(screen.getByTestId('Total (USDT)')).toHaveTextContent('100 USDT')
    expect(screen.getByTestId('Total (unknown-…)')).toHaveTextContent('0.0000005 unknown-…')
    expect(screen.getByTestId('Asset ID (USDT, unverified)')).toHaveTextContent('usdt-asset')
    expect(screen.getByTestId('Asset ID (unknown-…, unverified)')).toHaveTextContent('unknown-asset')
    expect(screen.queryByText('€100.00')).not.toBeInTheDocument()
  })
})

describe('a Taxi transfer', () => {
  const ASSET = 'f1'.repeat(34)
  const record = (over: Partial<TaxiActivity> = {}): TaxiActivity => ({
    role: 'sender',
    network: 'regtest',
    taxiUrl: 'https://taxi.mutinynet.arkade.sh',
    transferId: '3ccdf42c-2fc1-444b-8837-5efcae8e7fbc',
    mode: 'recycle',
    assetId: ASSET,
    units: '1',
    carrierSats: '330',
    fare: { currency: 'sats', units: '0' },
    lockupTxid: '2'.repeat(64),
    state: 'locked',
    updatedAt: 1_790_960_764,
    createdAt: 1_790_960_000,
    ...over,
  })
  const taxiOnly = (taxi: TaxiActivity, over: Partial<Tx> = {}): Tx => ({
    amount: 0,
    assets: [{ assetId: ASSET, amount: taxi.role === 'sender' ? -1n : 1n }],
    boardingTxid: '',
    createdAt: taxi.createdAt,
    explorable: undefined,
    historyKey: `taxi:${taxi.role}:taxi.mutinynet.arkade.sh:${taxi.transferId}`,
    networkFee: 0,
    preconfirmed: false,
    redeemTxid: '',
    roundTxid: '',
    settled: true,
    taxi,
    type: taxi.role === 'sender' ? 'sent' : 'received',
    ...over,
  })
  const receipt = (txInfo: Tx, { claims = {}, wallet = {} }: { claims?: object; wallet?: object } = {}) => {
    const tree = (txs: Tx[]) => (
      <NavigationContext.Provider value={mockNavigationContextValue}>
        <ConfigContext.Provider value={mockConfigContextValue}>
          <FiatContext.Provider value={mockFiatContextValue}>
            <AspContext.Provider value={mockAspContextValue}>
              <FlowContext.Provider value={{ ...mockFlowContextValue, txInfo }}>
                <WalletContext.Provider value={{ ...mockWalletContextValue, txs, ...wallet } as any}>
                  <ReceiverClaimsContext.Provider
                    value={{ remember: () => {}, claimable: new Set<string>(), openClaim: () => {}, ...claims }}
                  >
                    <LimitsContext.Provider value={mockLimitsContextValue}>
                      <Transaction />
                    </LimitsContext.Provider>
                  </ReceiverClaimsContext.Provider>
                </WalletContext.Provider>
              </FlowContext.Provider>
            </AspContext.Provider>
          </FiatContext.Provider>
        </ConfigContext.Provider>
      </NavigationContext.Provider>
    )
    const view = render(tree([txInfo]))
    return (txs: Tx[]) => view.rerender(tree(txs))
  }
  const checkAgain = () => userEvent.click(screen.getByRole('button', { name: 'Check again' }))
  const actions = () =>
    ['Check again', 'Claim', 'Settle transaction'].filter((name) => screen.queryByRole('button', { name }))

  beforeEach(() => checkTaxiPayment.mockReset())

  it('lists its Taxi, transfer, mode, carrier, fare, delivery, last update and lockup, and no settlement status', () => {
    receipt(taxiOnly(record()))
    expect(screen.getByTestId('Taxi')).toHaveTextContent('taxi.mutinynet.arkade.sh')
    expect(screen.getByTestId('Transfer ID')).toHaveTextContent('3ccdf42c-2f')
    expect(screen.getByTestId('Carrier mode')).toHaveTextContent('Receiver uses own sats')
    expect(screen.getByTestId('Carrier sats')).toHaveTextContent('Borrowed 330 sats')
    expect(screen.getByTestId('Taxi service fee')).toHaveTextContent('0 sats')
    expect(screen.getByTestId('Delivery')).toHaveTextContent('Awaiting claim')
    expect(screen.getByTestId('Last update')).toHaveTextContent('2026')
    expect(screen.getByTestId('Related transaction')).toHaveTextContent('22222222...22222222')
    expect(screen.queryByTestId('Status')).not.toBeInTheDocument()
  })

  it('spells out a failed submission in full, outside the truncating table, and offers a fresh check', () => {
    const failed = record({
      state: 'locking',
      submissionPhase: 'failed',
      failureCode: 'lockup_submission_invalid_provider_response',
      failureDetail: 'server checkpoint 0 changed unsigned fields or metadata',
    })
    receipt(taxiOnly(failed))
    expect(screen.getByText(/could not complete this payment/)).toBeInTheDocument()
    expect(screen.getByText('server checkpoint 0 changed unsigned fields or metadata')).toBeInTheDocument()
    expect(screen.getByText('Error code: lockup_submission_invalid_provider_response')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled()
  })

  it('opens the claim sheet of a delivery waiting for its receiver', async () => {
    const delivery = record({ role: 'receiver', returnsTo: 'sender' })
    const key = claimKey(delivery.taxiUrl, delivery.transferId)
    const openClaim = vi.fn()
    receipt(taxiOnly(delivery), { claims: { claimable: new Set([key]), openClaim } })
    expect(screen.getByText(/waiting for you/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Claim' }))
    expect(openClaim).toHaveBeenCalledWith(key)
  })

  it('checks a payment again with its Taxi, then reloads the wallet', async () => {
    const reloadWallet = vi.fn(async () => {})
    checkTaxiPayment.mockResolvedValue(undefined)
    const sending = record({ state: 'locking' })
    receipt(taxiOnly(sending), { wallet: { reloadWallet, svcWallet: mockSvcWallet, vtxoManager: undefined } })
    await checkAgain()
    await waitFor(() => expect(reloadWallet).toHaveBeenCalled())
    expect(checkTaxiPayment).toHaveBeenCalledWith(sending, mockSvcWallet)
  })

  it.each([
    [
      'its Taxi cannot be reached',
      new TaxiError('NETWORK_ERROR', 'taxi: GET could not be sent'),
      /reach the Taxi\. Showing the last known state/,
    ],
    [
      'the payment is still in doubt',
      new PendingDirectTaxi({} as PendingTaxiRecord, async () => '', new Error('Taxi transfer is refunding')),
      'Taxi transfer is refunding',
    ],
  ])('says so when %s', async (_, error, message) => {
    checkTaxiPayment.mockRejectedValue(error)
    receipt(taxiOnly(record({ state: 'locking' })))
    await checkAgain()
    expect(await screen.findByTestId('error-message')).toHaveTextContent(message)
  })

  it('takes a payment the Taxi returned as an outcome, not an error', async () => {
    checkTaxiPayment.mockRejectedValue(new ReturnedDirectTaxi({} as PendingTaxiRecord))
    receipt(taxiOnly(record({ state: 'locking' })))
    await checkAgain()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check again' })).toBeEnabled())
    expect(checkTaxiPayment).toHaveBeenCalled()
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
  })

  it.each([
    ['claimed', { state: 'recycled' }, 'The receiver claimed this payment.'],
    ['returned', { state: 'recovered' }, 'The Taxi returned this payment to you.'],
    ['never sent', { state: 'expired' }, /No money left your wallet/],
  ])('explains a %s payment and offers nothing to do', (_, over, explanation) => {
    receipt(taxiOnly(record(over)))
    expect(screen.getByText(explanation)).toBeInTheDocument()
    expect(actions()).toEqual([])
  })

  it('follows its record as it changes under the open receipt, even once a transaction row replaces it', () => {
    const update = receipt(taxiOnly(record()))
    expect(screen.getByTestId('Delivery')).toHaveTextContent('Awaiting claim')
    update([taxiOnly(record({ state: 'recycled' }), { redeemTxid: '2'.repeat(64), historyKey: 'tx:2' })])
    expect(screen.getByTestId('Delivery')).toHaveTextContent('Claimed')
  })

  it('shows only the transfer id of a row whose carrier names one, with nothing to do', () => {
    const carrier: CarrierActivity = {
      version: 1,
      mode: 'recycle',
      physicalSats: '330',
      loanSats: '329',
      purchasedSats: '1',
      receiptSats: '1',
      serviceFareSats: '0',
      taxi: { transferId: 'advance-1' },
      state: 'claimable',
      txids: [],
    }
    receipt({ ...mockTxInfo, boardingTxid: '', redeemTxid: '4'.repeat(64), carrier })
    expect(screen.getByTestId('Transfer ID')).toHaveTextContent('advance-1')
    expect(screen.queryByTestId('Taxi')).not.toBeInTheDocument()
    expect(actions()).toEqual([])
  })
})
