import Decimal from 'decimal.js'
import { prettyCurrencyAssetAmount, prettyFiatAmount, prettyFiatHide, prettyHide, prettyNumber } from './format'
import { designatedAccountCurrency, walletAccountTicker } from './accountAssets'
import type { WalletAssetSwap } from './swapRepository'
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

/**
 * How a grouped RFQ swap row reads.
 *
 * The resolver's `outcome` is an opaque machine token — the package emits
 * `pending`, `settled`, `refunded`, `failed` and `lost`, and says nothing about
 * wording — so the mapping to copy belongs here rather than in the row.
 *
 * Two of the five need care:
 *
 * - **`refunded`** is "Refunded", not "Failed". Nothing broke from the user's
 *   side: the solver could not pay the invoice and the covenant returned the
 *   funds, which is the same word the receipt already uses.
 * - **`lost`** is a `lightning_receive` that ended `refunded`, and it is the
 *   opposite of the above. On the receive leg every non-claim leaf of the
 *   covenant is the SOLVER's, so a lockup that went back is a payment that
 *   never arrived — money gone, not money returned. Calling it "refunded" here
 *   would tell the user the exact opposite of what happened, and would also
 *   disagree with the receive screen, which already renders this as a loss.
 *
 * `settled` adds no word: a send that went through is just "Lightning send",
 * the way a plain payment row carries no adverb.
 */
export function lnSwapLabel(tx: Tx): string | undefined {
  const swap = tx.lnSwap
  if (!swap) return undefined
  const stem = swap.label ?? 'Lightning send'
  if (swap.outcome === 'lost') return `${stem} lost`
  if (swap.outcome === 'refunded') return `${stem} refunded`
  if (swap.outcome === 'failed') return `${stem} failed`
  if (swap.outcome === 'pending') return `${stem} pending`
  return stem
}

export function swapRouteTicker(assetId: string | undefined, ticker: string | undefined): string | undefined {
  return assetId === 'btc' ? 'BTC' : (walletAccountTicker(ticker) ?? ticker)
}

export function swapRouteLabel(tx: Tx): string {
  return [
    { assetId: tx.assetSwap?.fromAssetId, ticker: tx.assetSwap?.fromTicker },
    { assetId: tx.assetSwap?.toAssetId, ticker: tx.assetSwap?.toTicker },
  ]
    .map(({ assetId, ticker }) => swapRouteTicker(assetId, ticker))
    .filter(Boolean)
    .join(' to ')
}

/** The masked/value pair for an asset amount, tickered by its account ticker
 * (BRL/USD outrank the raw asset ticker). Shared by the from/to legs and the fee. */
function swapAssetDisplayAmount(amount: bigint, decimals: number, ticker: string): SwapDisplayAmount {
  const accountTicker = walletAccountTicker(ticker) ?? ticker
  return {
    masked: prettyHide('hidden', accountTicker),
    value: `${prettyCurrencyAssetAmount(amount, decimals, accountTicker)} ${accountTicker}`,
  }
}

export function formatSwapAssetAmount(tx: Tx, side: 'from' | 'to'): SwapDisplayAmount | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined

  const amount = side === 'from' ? swap.fromAmount : swap.toAmount
  const decimals = side === 'from' ? swap.fromDecimals : swap.toDecimals
  const ticker = side === 'from' ? swap.fromTicker : swap.toTicker

  if (amount === undefined || decimals === undefined || !ticker) return undefined
  return swapAssetDisplayAmount(amount, decimals, ticker)
}

function swapFeeAtomic(tx: Tx): bigint | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined
  const { toAmount, feeBps } = swap
  if (toAmount === undefined || feeBps === undefined) return undefined
  if (toAmount <= BigInt(0) || feeBps < 0 || feeBps >= 10_000) return undefined
  if (feeBps === 0) return BigInt(0)
  return BigInt(
    new Decimal(toAmount.toString())
      .mul(feeBps)
      .div(10_000 - feeBps)
      .toFixed(0),
  )
}

/** The market fee, in the receive asset — same unit as the live composer's
 * Fees row. The stored toAmount is net of the fee, so the fee is the
 * gross-minus-net gap: toAmount × feeBps / (10000 − feeBps). */
export function swapFeeAmount(tx: Tx): SwapDisplayAmount | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined
  const { toDecimals, toTicker } = swap
  const fee = swapFeeAtomic(tx)
  if (fee === undefined || toDecimals === undefined || !toTicker) return undefined
  return swapAssetDisplayAmount(fee, toDecimals, toTicker)
}

export function swapAmountBeforeFee(tx: Tx): SwapDisplayAmount | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined
  const { toAmount, toDecimals, toTicker } = swap
  const fee = swapFeeAtomic(tx)
  if (toAmount === undefined || fee === undefined || toDecimals === undefined || !toTicker) return undefined
  return swapAssetDisplayAmount(toAmount + fee, toDecimals, toTicker)
}

/** Rate the swap was priced at, quoted pre-fee like the live composer's Rate
 * row: the covenant pins the net payout, so gross it back up by the stored
 * feeBps — the receipt's Swap fees row itemizes that same fee, and a
 * net-derived rate would count it twice. Restored swaps may lack feeBps;
 * then the net rate is all we have (matching the net Swap to row shown in
 * that case). */
export function swapPriceRateLabel(tx: Tx): string | undefined {
  const swap = tx.assetSwap
  if (!swap) return undefined
  const { fromAmount, fromDecimals, toAmount, toDecimals } = swap
  if (fromAmount === undefined || toAmount === undefined || fromDecimals === undefined || toDecimals === undefined)
    return undefined
  if (fromAmount <= BigInt(0) || toAmount <= BigInt(0)) return undefined
  const grossToAmount = toAmount + (swapFeeAtomic(tx) ?? BigInt(0))
  // BTC always displays in sats (0 decimals) elsewhere on the receipt, but a
  // rate quoted per satoshi ("1 sats = 0.0000006 USD") is unreadable — quote
  // it per whole BTC instead, same as the live composer's rate line.
  const fromRateDecimals = swap.fromAssetId === 'btc' ? 8 : fromDecimals
  const toRateDecimals = swap.toAssetId === 'btc' ? 8 : toDecimals
  const fromUnits = new Decimal(fromAmount.toString()).div(Decimal.pow(10, fromRateDecimals))
  const toUnits = new Decimal(grossToAmount.toString()).div(Decimal.pow(10, toRateDecimals))
  const rate = toUnits.div(fromUnits)
  const fromTicker = swapRouteTicker(swap.fromAssetId, swap.fromTicker)
  const toTicker = swapRouteTicker(swap.toAssetId, swap.toTicker)
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

  // every market has a BTC leg; its satoshi amount is the stable anchor
  const btcSats = swap?.fromAssetId === 'btc' ? swap.fromAmount : swap?.toAssetId === 'btc' ? swap.toAmount : undefined

  let selectedCurrencyAmount: number
  if (currency === Currencies.BTC) {
    // the unit of account is bitcoin itself: the amount IS the BTC leg's
    // satoshis, shown as sats. Never route this through toFiatAmount(_, BTC)
    // or a persisted BTC-denominated snapshot — those re-apply the live
    // bitcoin-unit setting (fromBTC/toBTC), so when the unit differs from swap
    // time the sats get read as whole BTC and the receipt inflates by 1e8.
    if (btcSats === undefined || btcSats <= BigInt(0)) return undefined
    selectedCurrencyAmount = Number(btcSats)
  } else if (swap?.fiatAmount !== undefined && swap.fiatCurrency !== Currencies.BTC) {
    // a fiat snapshot in a stable (non-BTC) currency: reconvert it into the
    // display currency. The round-trip through sats is price-stable in its own
    // currency, and fromFiatAmount for a real fiat never depends on the unit.
    const sourceCurrency = (swap.fiatCurrency as Currencies | undefined) ?? Currencies.USD
    selectedCurrencyAmount = toFiatAmount(fromFiatAmount(swap.fiatAmount, sourceCurrency), currency)
  } else {
    // no snapshot (restored swap), or a BTC-denominated one we can't trust:
    // value the BTC leg at the current rate instead
    if (btcSats === undefined || btcSats <= BigInt(0)) return undefined
    selectedCurrencyAmount = toFiatAmount(Number(btcSats), currency)
  }

  return {
    masked: prettyFiatHide(selectedCurrencyAmount, currency, formatOptions),
    value: prettyFiatAmount(selectedCurrencyAmount, currency, formatOptions),
  }
}

interface AssetSwapActivityOptions {
  network?: string
  assetDisplay?: (assetId: string) => { ticker?: string; decimals?: number } | undefined
}

/** The display row for one swap, from its record and the wallet rows that
 * funded and filled it. Facts are recomputed from the tx couple and asset
 * metadata where possible; the quote snapshot only fills what cannot be. */
export const buildAssetSwapActivityTx = (
  swap: WalletAssetSwap,
  members: Tx[],
  { network, assetDisplay }: AssetSwapActivityOptions = {},
): Tx => {
  const quote = swap.quote
  // the package's AssetSwapStatus also covers its RFQ and onchain corridors
  // (awaiting_fill, claimable, claimed, refunded_l1); an offer swap never
  // carries those, and anything unrecognised reads as still in flight
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
}
