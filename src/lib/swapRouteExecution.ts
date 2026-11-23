import {
  ArkAddress,
  selectVirtualCoins,
  type ExtendedVirtualCoin,
  type NetworkName,
  type ServiceWorkerWallet,
} from '@arkade-os/sdk'
import { parseAssetId, type Quote, type SwapRecord } from '@arkade-os/swap'
import { fundingWasNotSubmitted, recordOutcome } from '@arkade-os/swap/advanced'
import { decodeOffer } from '@arkade-os/swap/protocol'
import { hex } from '@scure/base'
import { toInvoiceFacts } from './lnSwap'
import { paymentQuoteExpiry } from './paymentQuotes'
import type { SwapRoutePlan } from './swapRoutePlan'

export type SwapRouteProgress = {
  phase: 'waiting' | 'ready' | 'complete' | 'stopped'
  step: number
  swapId?: string
  invoice?: { bolt11: string; expiresAt: number }
  reason?: 'expired' | 'recovery' | 'returned' | 'quote-unavailable'
}

export const swapRouteFundingKey = (walletKey: string, routeId: string) =>
  JSON.stringify(['swap-route', walletKey, routeId])
export const swapRoutePointerKey = (walletKey: string) => `active-swap-route:${walletKey}`
export const swapRouteLegKey = (key: string, step: number) => `${key}:${step}`
export const swapRouteFamily = (quote: Quote) => (quote.route.give.corridor === 'lightning' ? 'rfq' : 'offer')

export function routeLegStatus(record: SwapRecord): 'waiting' | 'settled' | 'expired' | 'recovery' | 'returned' {
  if (fundingWasNotSubmitted(record)) return 'expired'
  if (record.family === 'offer') {
    const state = recordOutcome(record)
    if (state === 'filled' && record.spentTxid) return 'settled'
    if (state === 'cancelled' && record.spentTxid) return 'returned'
    return state === 'needs_recovery' ? 'recovery' : 'waiting'
  }
  if (record.kind !== 'lightning_receive') return 'recovery'
  if (record.state === 'settled') return 'settled'
  if (record.state === 'refunded') return 'returned'
  return record.state === 'needs_counterparty' || record.state === 'failed' ? 'recovery' : 'waiting'
}

export function routeFundingInvoice(record: SwapRecord, plan: SwapRoutePlan): SwapRouteProgress['invoice'] {
  if (record.family !== 'rfq' || record.kind !== 'lightning_receive' || record.artifact?.kind !== 'invoice') return
  const quote = plan.quotes[0]
  const expected = quote.route.give.instrument
  if (record.id !== quote.id || record.state !== 'pending' || expected.kind !== 'invoice') return
  const { bolt11 } = record.artifact
  if (expected.bolt11 !== bolt11) return
  try {
    const { expiresAt, amountSats, paymentHash } = toInvoiceFacts(
      bolt11,
      parseAssetId(record.take.asset).reference as NetworkName,
    )
    if (
      BigInt(amountSats) !== quote.give.amount ||
      paymentHash !== record.lock.hash ||
      paymentHash !== expected.paymentHash
    )
      return
    if (Math.min(plan.expiresAt, expiresAt) <= Math.floor(Date.now() / 1000)) return
    return { bolt11, expiresAt: Math.min(plan.expiresAt, expiresAt) }
  } catch {
    return undefined
  }
}

function payoutOf(record: SwapRecord): { txids: readonly string[]; script: string } | undefined {
  if (routeLegStatus(record) !== 'settled') return
  if (record.family === 'offer') {
    const script =
      record.binding?.receiverPkScript ??
      (record.offerHex && hex.encode(decodeOffer(hex.decode(record.offerHex)).makerPkScript))
    if (script && record.spentTxid) return { txids: [record.spentTxid], script }
    return
  }
  const address = record.profile?.payoutAddress
  if (typeof address !== 'string') return
  const script = hex.encode(ArkAddress.decode(address).pkScript)
  const claimTxid = record.profile?.claimTxid
  const txids = [...(record.lockupSpendTxids ?? []), ...(typeof claimTxid === 'string' ? [claimTxid] : [])]
  if (txids.length) return { txids, script }
}

export async function findSwapRoutePayout(
  wallet: Pick<ServiceWorkerWallet, 'getSpendableVtxos'>,
  record: SwapRecord,
  next: Quote,
  minChange: bigint,
): Promise<ExtendedVirtualCoin | undefined> {
  if (
    record.take.asset !== next.give.asset ||
    record.take.amount !== String(next.give.amount) ||
    record.route.take.instrument.kind !== 'wallet' ||
    next.route.give.instrument.kind !== 'wallet'
  )
    return
  const payout = payoutOf(record)
  if (!payout || next.route.give.corridor !== 'arkade') return
  const parsed = parseAssetId(next.give.asset)
  const btc = parsed.assetNamespace === 'slip44'
  const debit = btc ? next.give.amount : next.carrierSats
  if (debit === undefined || debit <= 0n) return
  const coins = await wallet.getSpendableVtxos({
    withRecoverable: false,
    genericallySpendableOnly: true,
    requireSynced: true,
  })
  return coins.find((coin) => {
    if (!payout.txids.includes(coin.txid) || coin.script !== payout.script) return false
    const change = BigInt(coin.value) - debit
    if (change < 0n || (change > 0n && change < minChange)) return false
    if (btc) return !coin.assets?.length
    return (
      coin.assets?.length === 1 &&
      coin.assets[0].assetId === parsed.assetReference &&
      coin.assets[0].amount === next.give.amount
    )
  })
}

export const routeQuoteLive = (quote: Quote) => paymentQuoteExpiry(quote) > Math.floor(Date.now() / 1000)

export async function selectRouteBitcoinInputs(
  wallet: Pick<ServiceWorkerWallet, 'getSpendableVtxos'>,
  debit: bigint,
  minChange: bigint,
): Promise<ExtendedVirtualCoin[]> {
  const coins = (
    await wallet.getSpendableVtxos({ withRecoverable: false, genericallySpendableOnly: true, requireSynced: true })
  ).filter((coin) => !coin.assets?.length)
  const exact = coins.find((coin) => BigInt(coin.value) === debit)
  if (exact) return [exact]
  const first = selectVirtualCoins(coins, Number(debit))
  if (first.changeAmount === 0n || first.changeAmount >= minChange) return first.inputs
  return selectVirtualCoins(coins, Number(debit + minChange)).inputs
}
