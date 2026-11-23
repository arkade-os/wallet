import { selectCoinsWithAsset, selectVirtualCoins, type NetworkName, type ServiceWorkerWallet } from '@arkade-os/sdk'
import { btcOn, type OfferSwapRecord, type Quote, type QuoteInput, type SwapRecord } from '@arkade-os/swap'
import { fundingWasNotSubmitted, recordOutcome } from '@arkade-os/swap/advanced'
import { decodeOffer } from '@arkade-os/swap/protocol'
import { hex } from '@scure/base'
import { isValidAssetId } from './assets'
import { canReplaceMissingPaymentRecord, type PaymentFundingAttempt } from './paymentFunding'
import { paymentQuoteExpiry } from './paymentQuotes'
import { swapAssetId } from './swapMarkets'

const spendable = { withRecoverable: false, genericallySpendableOnly: true, requireSynced: true } as const
type SpendableWallet = Pick<ServiceWorkerWallet, 'getSpendableVtxos'>

export type ChainedPaymentStatus = {
  phase: 'converting' | 'credited' | 'returned' | 'recovery'
  swapId: string
  sats: bigint
  spendable?: boolean
}

export const conversionFundingKey = (invoiceKey: string) => `conversion:${invoiceKey}`

export function conversionQuoteInput(assetId: string, sats: bigint, network: NetworkName): QuoteInput {
  if (!isValidAssetId(assetId) || sats <= 0n || sats > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Invalid asset conversion')
  }
  return { give: swapAssetId(network, assetId), take: btcOn('arkade', network), amount: sats, amountOn: 'take' }
}

export function assertConversionQuote(
  quote: Quote,
  assetId: string,
  sats: bigint,
  network: NetworkName,
  dust: bigint,
): void {
  const { give, take } = conversionQuoteInput(assetId, sats, network)
  if (
    quote.market.backend !== 'rfq' ||
    quote.route.give.corridor !== 'arkade' ||
    quote.route.take.corridor !== 'arkade' ||
    quote.route.give.instrument.kind !== 'wallet' ||
    quote.route.take.instrument.kind !== 'wallet' ||
    quote.route.give.asset !== give ||
    quote.route.take.asset !== take ||
    quote.give.asset !== give ||
    quote.take.asset !== take ||
    quote.give.amount <= 0n ||
    quote.take.amount !== sats ||
    typeof quote.carrierSats !== 'bigint' ||
    quote.carrierSats <= 0n ||
    quote.carrierSats < dust ||
    sats < dust ||
    quote.carrierSats > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error('The conversion quote does not deliver the required Bitcoin to this wallet')
  }
  const expiry = paymentQuoteExpiry(quote)
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
    throw new Error('The conversion quote has expired')
  }
}

export async function selectConversionInputs(
  wallet: SpendableWallet,
  assetId: string,
  give: bigint,
  carrier: bigint,
  dust: bigint,
  minimum: bigint,
) {
  const coins = await wallet.getSpendableVtxos(spendable)
  const { selected, totalAssetAmount } = selectCoinsWithAsset(coins, assetId, give)
  const hasAssetChange =
    totalAssetAmount > give || selected.some((coin) => coin.assets?.some((asset) => asset.assetId !== assetId))
  const change = selected.reduce((value, coin) => value + BigInt(coin.value), 0n) - carrier
  const assetChangeMinimum = dust > minimum ? dust : minimum
  if (
    (!hasAssetChange && change === 0n) ||
    (change > 0n && change >= (hasAssetChange ? assetChangeMinimum : minimum))
  ) {
    return selected
  }

  const outpoint = ({ txid, vout }: { txid: string; vout: number }) => `${txid}:${vout}`
  const chosen = new Set(selected.map(outpoint))
  const remaining = coins.filter((coin) => !chosen.has(outpoint(coin)))
  if (!hasAssetChange && change < 0n) {
    const exact = remaining.find((coin) => !coin.assets?.length && BigInt(coin.value) === -change)
    if (exact) return [...selected, exact]
  }
  const plain = remaining.filter((coin) => !coin.assets?.length)
  const needs = minimum - change
  const canUsePlain = !hasAssetChange && plain.reduce((total, coin) => total + BigInt(coin.value), 0n) >= needs
  const target = canUsePlain ? needs : assetChangeMinimum - change
  if (target > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The change funding amount is too large')
  try {
    const { inputs } = selectVirtualCoins(canUsePlain ? plain : remaining, Number(target))
    return [...selected, ...inputs]
  } catch (error) {
    throw new Error('This conversion needs more BTC to fund the deposit and return change', { cause: error })
  }
}

export function conversionStatus(
  attempt: PaymentFundingAttempt | undefined,
  record: SwapRecord | undefined,
  guarded = false,
): ChainedPaymentStatus | undefined {
  if (!attempt?.chain) return
  if (record ? fundingWasNotSubmitted(record) : canReplaceMissingPaymentRecord(attempt, guarded)) return
  const status = { swapId: attempt.swapId, sats: attempt.chain.sats }
  if (record?.family === 'offer') {
    const outcome = recordOutcome(record)
    if (outcome === 'filled' && record.fundingTxid && record.spentTxid && record.take.amount === String(status.sats)) {
      return { ...status, phase: 'credited' }
    }
    if (outcome === 'cancelled' && record.fundingTxid && record.spentTxid) return { ...status, phase: 'returned' }
    if (outcome === 'needs_recovery') return { ...status, phase: 'recovery' }
  }
  return { ...status, phase: 'converting' }
}

export async function findConversionPayout(wallet: SpendableWallet, record: OfferSwapRecord, sats: bigint) {
  const script =
    record.binding?.receiverPkScript ??
    (record.offerHex && hex.encode(decodeOffer(hex.decode(record.offerHex)).makerPkScript))
  if (!script || !record.spentTxid) return
  const coins = await wallet.getSpendableVtxos(spendable)
  return coins.find(
    (coin) =>
      coin.txid === record.spentTxid && coin.script === script && BigInt(coin.value) === sats && !coin.assets?.length,
  )
}
