import { asset, btcTarget, invoiceTarget, type NetworkName } from '@arkade-os/sdk'
import { arkadeAsset, btcOn, type Quote, type QuoteInput } from '@arkade-os/swap'
import type { DiscoveredMarket } from '@arkade-os/solver-discovery'
import { toInvoiceFacts } from './lnSwap'
import { isValidAssetId } from './assets'

export type OpenPaymentRequest =
  | { kind: 'lightning'; invoice: string; amount?: number }
  | { kind: 'bitcoin'; address: string; amount: number }

export interface AssetPaymentRequest {
  address: string
  assetId: string
  amount: bigint
}

export type PaymentQuoteRequest = OpenPaymentRequest | ({ kind: 'asset' } & AssetPaymentRequest)

function invoiceFacts(request: Extract<OpenPaymentRequest, { kind: 'lightning' }>, network: NetworkName) {
  const invoice = invoiceTarget(request.invoice)
  if (!invoice) throw new Error('Enter a valid Lightning invoice')
  const facts = toInvoiceFacts(invoice, network)
  if (request.amount !== undefined && request.amount !== facts.amountSats) {
    throw new Error('The requested amount does not match the Lightning invoice')
  }
  return facts
}

export function openPaymentQuoteInput(request: OpenPaymentRequest, network: NetworkName): QuoteInput {
  if (request.kind === 'lightning') return { to: invoiceFacts(request, network).raw }
  const address = btcTarget(request.address)
  if (!address || !Number.isSafeInteger(request.amount) || request.amount <= 0) {
    throw new Error('Enter a valid Bitcoin address and amount')
  }
  return { to: address, amount: BigInt(request.amount), amountOn: 'take' }
}

export function assetPaymentQuoteInput(request: AssetPaymentRequest, network: NetworkName): QuoteInput {
  if (!isValidAssetId(request.assetId) || typeof request.amount !== 'bigint' || request.amount <= 0n) {
    throw new Error('Enter a valid asset ID and a positive amount')
  }
  return {
    give: btcOn('arkade', network),
    take: arkadeAsset(network, asset.AssetId.fromString(request.assetId)),
    amount: request.amount,
    amountOn: 'take',
    assetPayment: { receiveAddress: request.address },
  }
}

export function paymentQuoteExpiry(quote: Quote): number {
  return Math.min(quote.expiresAt, quote.assetPayment?.validUntil ?? quote.expiresAt)
}

export function paymentQuoteInput(request: PaymentQuoteRequest, network: NetworkName): QuoteInput {
  return request.kind === 'asset' ? assetPaymentQuoteInput(request, network) : openPaymentQuoteInput(request, network)
}

export function paymentAttemptKey(
  request: PaymentQuoteRequest,
  network: NetworkName,
  walletPubkey: string | undefined,
  reviewId?: string,
): string {
  if (!walletPubkey) throw new Error('Payment wallet is unavailable')
  if (request.kind === 'lightning') {
    return JSON.stringify([
      network,
      walletPubkey,
      'lightning',
      invoiceFacts(request, network).paymentHash.toLowerCase(),
    ])
  }
  if (typeof reviewId !== 'string' || !reviewId) throw new Error('The payment review is unavailable')
  // A review can reopen after editing the composer. Only the same payment
  // details can resume its existing attempt.
  const target = request.kind === 'bitcoin' ? btcTarget(request.address) : request.address
  const assetId = request.kind === 'asset' ? request.assetId : undefined
  return JSON.stringify([network, walletPubkey, request.kind, reviewId, target, assetId, String(request.amount)])
}

function assertWalletPaymentQuote(quote: Quote, network: NetworkName) {
  if (
    quote.route.give.corridor !== 'arkade' ||
    quote.route.give.instrument.kind !== 'wallet' ||
    quote.route.give.asset !== btcOn('arkade', network) ||
    quote.give.asset !== quote.route.give.asset ||
    quote.take.asset !== quote.route.take.asset ||
    quote.give.amount <= 0n ||
    quote.give.amount > BigInt(Number.MAX_SAFE_INTEGER) ||
    quote.take.amount <= 0n ||
    quote.market.backend !== 'rfq'
  ) {
    throw new Error('This quote does not match the payment')
  }
  const expiry = paymentQuoteExpiry(quote)
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
    throw new Error('This quote has expired')
  }
}

export function assertOpenPaymentQuote(quote: Quote, request: OpenPaymentRequest, network: NetworkName): void {
  assertWalletPaymentQuote(quote, network)
  const receiver = quote.route.take.instrument
  if (request.kind === 'lightning') {
    const invoice = invoiceFacts(request, network)
    if (
      quote.route.take.corridor === 'lightning' &&
      quote.take.asset === btcOn('bolt11', network) &&
      receiver.kind === 'invoice' &&
      receiver.paymentHash.toLowerCase() === invoice.paymentHash.toLowerCase() &&
      receiver.bolt11.toLowerCase() === invoice.raw.toLowerCase() &&
      quote.take.amount === BigInt(invoice.amountSats)
    )
      return
  } else if (
    quote.route.take.corridor === 'onchain' &&
    quote.take.asset === btcOn('bitcoin', network) &&
    receiver.kind === 'address' &&
    receiver.address === btcTarget(request.address) &&
    quote.take.amount === BigInt(request.amount) &&
    typeof quote.onchainClaimFee === 'bigint' &&
    quote.onchainClaimFee > 0n
  )
    return
  throw new Error('This quote does not match the recipient and amount')
}

export function assertAssetPaymentQuote(quote: Quote, request: AssetPaymentRequest, network: NetworkName): void {
  assertWalletPaymentQuote(quote, network)
  const receiver = quote.route.take.instrument
  if (
    quote.route.take.corridor !== 'arkade' ||
    receiver.kind !== 'address' ||
    receiver.address !== request.address ||
    quote.assetPayment?.receiveAddress !== request.address ||
    quote.take.asset !== arkadeAsset(network, asset.AssetId.fromString(request.assetId)) ||
    quote.take.amount !== request.amount
  ) {
    throw new Error('This quote does not deliver the requested asset amount to the recipient')
  }
}

export function quoteProviderMarket(
  quote: Quote,
): Pick<DiscoveredMarket, 'solver' | 'source' | 'sourceType' | 'discovery_pubkey'> | undefined {
  if (quote.market.kind !== 'card') return undefined
  return {
    solver: quote.market.solver,
    source: quote.market.source,
    sourceType: quote.market.sourceType,
    discovery_pubkey: quote.market.discoveryPubkey,
  }
}
