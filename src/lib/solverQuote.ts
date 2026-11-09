import {
  quoteOffer,
  rankSolverMarkets,
  solverDirectionKey,
  toAtomic,
  type DiscoveredMarket,
  type OfferPlan,
} from '@arkade-os/solver-discovery'
import { ASSET_CARRIER_SATS, findMarket, QUOTE_OPTIONS, validatePlan } from '@arkade-os/swap/protocol'
import { readSolverRouting } from './solverRouting'
import { solverUsage } from './swapRecords'

export const previewSolverQuote = async (
  markets: DiscoveredMarket[],
  from: string,
  to: string,
  amount: string,
  network: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
  dust: bigint = ASSET_CARRIER_SATS,
): Promise<OfferPlan> => {
  const candidates = markets.flatMap((card) => {
    const pair = findMarket([card], from, to)
    return pair?.market ? [{ card, give: pair.give }] : []
  })
  if (!candidates.length) throw new Error('Swap unavailable for this pair')
  const first = candidates[0]
  const direction = solverDirectionKey(first.card, first.give, network)
  const prefs = readSolverRouting(network, direction)
  const usage = prefs.mode === 'usage' ? await solverUsage(network, direction) : undefined
  const decimals = (first.give === 'base' ? first.card.base_asset : first.card.quote_asset).decimals
  const ordered = await rankSolverMarkets(candidates, {
    network,
    preferences: { ...prefs, usage },
    amount: { on: 'give', value: toAtomic(amount, decimals) },
    carrierSats: ASSET_CARRIER_SATS,
    fetchImpl,
    signal,
  })
  let invalidPlan: OfferPlan | undefined
  let lastError: unknown = new Error('Quote unavailable')
  for (const { card, give } of ordered) {
    if (signal?.aborted) throw signal.reason
    try {
      const plan = await quoteOffer(card, {
        give,
        giveAmount: amount,
        carrierSats: ASSET_CARRIER_SATS,
        fetchImpl,
        signal,
        ...QUOTE_OPTIONS,
      })
      // Preview eligibility checks bounds and dust; the composer checks the actual wallet balance.
      if (!validatePlan(plan, plan.deposit.atomic, dust)) return plan
      invalidPlan ??= plan
      lastError = new Error('Amount outside solver bounds')
    } catch (error) {
      if (signal?.aborted) throw error
      lastError = error
    }
  }
  if (invalidPlan) return invalidPlan
  throw lastError
}
