import Decimal from 'decimal.js'
import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyFiatHide, prettyHide, prettyNumber } from './format'
import { designatedAccountCurrency, walletAccountTicker } from './accountAssets'
import { getAssetSwaps } from './swap/store'
import { Currencies, Tx, Unit } from './types'

export type SwapStatus = 'pending' | 'failed' | 'completed' | 'cancelled' | 'recoverable'

export interface SwapDisplayAmount {
  masked: string
  value: string
}

interface SwapUnitOfAccountAmountOptions {
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

/** Rate the covenant enforced: receive-asset units bought by one unit of the
 * sent asset, recomputed from the stored atomic amounts. */
export function swapPriceRateLabel(tx: Tx): string | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined
  const { fromAmount, fromDecimals, toAmount, toDecimals } = swap
  if (fromAmount === undefined || toAmount === undefined || fromDecimals === undefined || toDecimals === undefined)
    return undefined
  if (fromAmount <= BigInt(0) || toAmount <= BigInt(0)) return undefined
  // BTC always displays in sats (0 decimals) elsewhere on the receipt, but a
  // rate quoted per satoshi ("1 sats = 0.0000006 USD") is unreadable — quote
  // it per whole BTC instead, same as the live composer's rate line.
  const fromRateDecimals = swap.fromAssetId === 'btc' ? 8 : fromDecimals
  const toRateDecimals = swap.toAssetId === 'btc' ? 8 : toDecimals
  const fromUnits = new Decimal(fromAmount.toString()).div(Decimal.pow(10, fromRateDecimals))
  const toUnits = new Decimal(toAmount.toString()).div(Decimal.pow(10, toRateDecimals))
  const rate = toUnits.div(fromUnits)
  const fromTicker = swap.fromAssetId === 'btc' ? 'BTC' : (walletAccountTicker(swap.fromTicker) ?? swap.fromTicker)
  const toTicker = swap.toAssetId === 'btc' ? 'BTC' : (walletAccountTicker(swap.toTicker) ?? swap.toTicker)
  // deliberately a coarser 2-bucket precision than swapAmountDecimals — a
  // receipt only needs enough precision to eyeball, not display-grid parity
  return `1 ${fromTicker} = ${prettyNumber(rate, rate.lt(1) ? 8 : 2, true, 2)} ${toTicker}`
}

export function swapUnitOfAccountAmount({
  currency,
  fromFiatAmount,
  toFiatAmount,
  tx,
}: SwapUnitOfAccountAmountOptions): SwapDisplayAmount | undefined {
  const swap = tx.assetSwap
  // the swap screens always display BTC in sats, independent of the
  // wallet-wide bitcoin-unit setting — even when that setting is itself the
  // unit of account (currency === BTC)
  const formatOptions = { bitcoinUnit: Unit.SATS }

  let selectedCurrencyAmount: number
  if (swap?.fiatAmount !== undefined) {
    const sourceCurrency = (swap.fiatCurrency as Currencies | undefined) ?? Currencies.USD
    selectedCurrencyAmount = toFiatAmount(fromFiatAmount(swap.fiatAmount, sourceCurrency), currency)
  } else {
    // restored swaps lost the quote-time snapshot: value the BTC leg at the
    // current rate instead
    const btcSats =
      swap?.fromAssetId === 'btc' ? swap.fromAmount : swap?.toAssetId === 'btc' ? swap.toAmount : undefined
    if (btcSats === undefined || btcSats <= BigInt(0)) return undefined
    selectedCurrencyAmount = toFiatAmount(Number(btcSats), currency)
  }

  return {
    masked: prettyFiatHide(selectedCurrencyAmount, currency, formatOptions),
    value: prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions),
  }
}

/** Collapse the funding and fill wallet rows into one persisted swap activity.
 * Display facts are recomputed from the tx couple and asset metadata where
 * possible; the quote snapshot only fills what cannot be recomputed. */
export const mergeAssetSwapActivity = (
  txs: Tx[],
  swaps = getAssetSwaps(),
  network?: string,
  assetDisplay?: (assetId: string) => { ticker?: string; decimals?: number } | undefined,
): Tx[] => {
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
    // the currency designation outranks the asset's self-reported ticker, so
    // restored swaps read "BRL to sats", not "DEPIX to sats"; BTC is always
    // shown in sats, matching the live swap screen
    const derivedTicker = (assetId: string) =>
      assetId === 'btc'
        ? 'sats'
        : (designatedAccountCurrency(network, assetId) ?? assetDisplay?.(assetId)?.ticker ?? assetId.slice(0, 8))
    const derivedDecimals = (assetId: string) => (assetId === 'btc' ? 0 : assetDisplay?.(assetId)?.decimals)
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
        fromTicker: quote?.fromTicker ?? derivedTicker(swap.fromAsset),
        fromDecimals: quote?.fromDecimals ?? derivedDecimals(swap.fromAsset),
        fromAmount: BigInt(swap.fromAmount),
        toAssetId: swap.toAsset,
        toTicker: quote?.toTicker ?? derivedTicker(swap.toAsset),
        toDecimals: quote?.toDecimals ?? derivedDecimals(swap.toAsset),
        toAmount: receivedAmount,
        fiatAmount: quote?.fromFiatAmount,
        fiatCurrency: quote?.fiatCurrency,
        feeBps: quote?.feeBps,
        fundingTxid: swap.fundingTxid,
        fillTxid: swap.status === 'fulfilled' || swap.status === 'cancelled' ? swap.spentTxid : undefined,
        status,
      },
    }
  })

  return [...activities, ...txs.filter((tx) => !claimed.has(tx))].sort((a, b) => b.createdAt - a.createdAt)
}
