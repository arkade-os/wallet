import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
import { AssetsContext } from '../../../providers/assets'
import { MUTINYNET_USDT_ASSET_ID } from '../../../lib/accountAssets'
import { AssetSwapsContext } from '../../../providers/assetSwaps'
import type { WalletAssetSwap as AssetSwap } from '../../../lib/swapRepository'

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
    fundingTxid: 'funding-txid',
  },
  preconfirmed: true,
  redeemTxid: 'funding-txid',
  roundTxid: '',
  settled: false,
  type: 'swap',
}

const pendingSwap: AssetSwap = {
  id: 'funding-txid',
  fromAsset: 'btc',
  toAsset: 'asset-beta',
  fromAmount: '10000',
  toAmount: '500',
  swapAddress: 'tark1q...',
  swapPkScript: `5120${'ab'.repeat(32)}`,
  offerHex: '0100',
  fundingTxid: 'funding-txid',
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
    expect(cancel).toHaveBeenCalledWith('funding-txid')
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
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByText('Asset amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
    // right side of the table
    expect(await screen.findByText('Amount received')).toBeInTheDocument()
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
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByText('Asset amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Amount received')).toBeInTheDocument()
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
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByText('Asset amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Amount received')).toBeInTheDocument()
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
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByText('Asset amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Amount received')).toBeInTheDocument()
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
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByText('Asset amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
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
    // left side of the table
    expect(screen.getByText('Network fees')).toBeInTheDocument()
    expect(screen.getByText('Transaction')).toBeInTheDocument()
    expect(screen.queryByText('Direction')).not.toBeInTheDocument()
    expect(screen.getByText('Asset amount')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
    // right side of the table
    expect(screen.getByText('Amount received')).toBeInTheDocument()
    expect(screen.getByText('0 BTC')).toBeInTheDocument()
    // buttons should not be present
    expect(screen.queryByText('Settle transaction')).not.toBeInTheDocument()
    expect(screen.queryByText('Add reminder')).not.toBeInTheDocument()
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
    expect(screen.queryByText('123.45 ALP')).not.toBeInTheDocument()
    expect(screen.queryByText('67.89 BET')).not.toBeInTheDocument()
    expect(screen.queryByText('0.204 BET')).not.toBeInTheDocument()
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
