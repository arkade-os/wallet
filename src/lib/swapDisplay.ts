import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyFiatHide, prettyHide } from './format'
import { designatedAccountCurrency, walletAccountTicker } from './accountAssets'
import { getAssetSwaps } from './swap/store'
import { Currencies, Tx, Unit } from './types'

export type SwapStatus = 'pending' | 'failed' | 'completed' | 'cancelled' | 'recoverable'

export interface SwapDisplayAmount {
  masked: string
  value: string
}

interface SwapUnitOfAccountAmountOptions {
  bitcoinUnit: Unit
  currency: Currencies
  fromFiatAmount: (amount: number, currency: Currencies) => number
  toFiatAmount: (satoshis: number, currency: Currencies) => number
  tx: Tx
}

export function swapStatusForTx(tx: Tx): SwapStatus {
  if (tx.assetSwap?.status) return tx.assetSwap.status
  return tx.settled ? 'completed' : 'pending'
}

export function swapStatusLabel(tx: Tx): string {
  const status = swapStatusForTx(tx)
  if (status === 'failed') return 'Failed'
  if (status === 'cancelled') return 'Cancelled'
  if (status === 'recoverable') return 'Recoverable'
  if (status === 'pending') return 'Pending'
  return 'Completed'
}

export function swapRouteLabel(tx: Tx): string {
  return [tx.assetSwap?.fromTicker, tx.assetSwap?.toTicker]
    .map((ticker) => walletAccountTicker(ticker) ?? ticker)
    .filter(Boolean)
    .join(' to ')
}

export function formatSwapAssetAmount(tx: Tx, side: 'from' | 'to'): SwapDisplayAmount | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined

  const amount = side === 'from' ? swap.fromAmount : swap.toAmount
  const decimals = side === 'from' ? swap.fromDecimals : swap.toDecimals
  const ticker = side === 'from' ? swap.fromTicker : swap.toTicker

  if (amount === undefined || decimals === undefined || !ticker) return undefined
  const accountTicker = walletAccountTicker(ticker) ?? ticker
  return {
    masked: prettyHide('hidden', accountTicker),
    value: `${prettyCurrencyAssetAmount(amount, decimals, accountTicker)} ${accountTicker}`,
  }
}

export function swapUnitOfAccountAmount({
  bitcoinUnit,
  currency,
  fromFiatAmount,
  toFiatAmount,
  tx,
}: SwapUnitOfAccountAmountOptions): SwapDisplayAmount | undefined {
  const fiatAmount = tx.assetSwap?.fiatAmount
  if (fiatAmount === undefined) return undefined

  const sourceCurrency = (tx.assetSwap?.fiatCurrency as Currencies | undefined) ?? Currencies.USD
  const selectedCurrencyAmount = toFiatAmount(fromFiatAmount(fiatAmount, sourceCurrency), currency)
  const formatOptions = { bitcoinUnit }

  return {
    masked: prettyFiatHide(selectedCurrencyAmount, currency, formatOptions),
    value: prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions),
  }
}

/** Collapse the funding and fill wallet rows into one persisted swap activity. */
export const mergeAssetSwapActivity = (txs: Tx[], swaps = getAssetSwaps(), network?: string): Tx[] => {
  const claimed = new Set<Tx>()
  const activities = swaps.map<Tx>((swap) => {
    const members = txs.filter((tx) => {
      const ids = [tx.boardingTxid, tx.redeemTxid, tx.roundTxid]
      const match = ids.includes(swap.fundingTxid) || Boolean(swap.spentTxid && ids.includes(swap.spentTxid))
      if (match) claimed.add(tx)
      return match
    })
    const quote = swap.quote
    const status =
      swap.status === 'fulfilled'
        ? 'completed'
        : swap.status === 'cancelled'
          ? 'cancelled'
          : swap.status === 'recoverable'
            ? 'recoverable'
            : 'pending'
    const fill = swap.spentTxid
      ? members.find((tx) => [tx.boardingTxid, tx.redeemTxid, tx.roundTxid].includes(swap.spentTxid!))
      : undefined
    const receivedAsset = fill?.assets?.find((asset) => asset.assetId === swap.toAsset && asset.amount > BigInt(0))
    const receivedAmount =
      swap.toAsset === 'btc' && fill?.amount && fill.amount > 0
        ? BigInt(fill.amount)
        : (receivedAsset?.amount ?? BigInt(swap.toAmount))
    const fallbackTicker = (assetId: string) =>
      assetId === 'btc' ? 'BTC' : (designatedAccountCurrency(network, assetId) ?? assetId.slice(0, 8))
    return {
      amount: members[0]?.amount ?? 0,
      boardingTxid: '',
      createdAt: Math.floor(swap.createdAt / 1000),
      explorable: undefined,
      preconfirmed: status === 'pending',
      redeemTxid: swap.spentTxid ?? swap.fundingTxid,
      roundTxid: '',
      settled: status !== 'pending',
      type: 'swap',
      assetSwap: {
        fromAssetId: swap.fromAsset,
        fromTicker: quote?.fromTicker ?? fallbackTicker(swap.fromAsset),
        fromDecimals: quote?.fromDecimals,
        fromAmount: BigInt(swap.fromAmount),
        toAssetId: swap.toAsset,
        toTicker: quote?.toTicker ?? fallbackTicker(swap.toAsset),
        toDecimals: quote?.toDecimals,
        toAmount: receivedAmount,
        fiatAmount: quote?.fromFiatAmount,
        fiatCurrency: quote?.fiatCurrency,
        feeBps: quote?.feeBps,
        status,
      },
    }
  })

  return [...activities, ...txs.filter((tx) => !claimed.has(tx))].sort((a, b) => b.createdAt - a.createdAt)
}
