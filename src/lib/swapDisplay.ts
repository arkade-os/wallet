import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyFiatHide, prettyHide } from './format'
import { walletAccountTicker } from './accountAssets'
import { Currencies, Tx, Unit } from './types'

export type SwapStatus = 'pending' | 'failed' | 'completed'

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
  if (tx.prototypeSwap?.status) return tx.prototypeSwap.status
  return tx.settled ? 'completed' : 'pending'
}

export function swapStatusLabel(tx: Tx): string {
  const status = swapStatusForTx(tx)
  if (status === 'failed') return 'Failed'
  if (status === 'pending') return 'Pending'
  return 'Completed'
}

export function swapRouteLabel(tx: Tx): string {
  return [tx.prototypeSwap?.fromTicker, tx.prototypeSwap?.toTicker]
    .map((ticker) => walletAccountTicker(ticker) ?? ticker)
    .filter(Boolean)
    .join(' to ')
}

export function formatSwapAssetAmount(tx: Tx, side: 'from' | 'to'): SwapDisplayAmount | undefined {
  const swap = tx.prototypeSwap
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
  const usdAmount = tx.prototypeSwap?.fiatAmount
  if (usdAmount === undefined) return undefined

  const selectedCurrencyAmount = toFiatAmount(fromFiatAmount(usdAmount, Currencies.USD), currency)
  const formatOptions = { bitcoinUnit }

  return {
    masked: prettyFiatHide(selectedCurrencyAmount, currency, formatOptions),
    value: prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions),
  }
}
