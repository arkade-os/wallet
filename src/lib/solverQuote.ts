import {
  quoteOffer,
  orderSolverMarkets,
  rankSolverMarkets,
  solverDirectionKey,
  solverId,
  toAtomic,
  type DiscoveredMarket,
  type OfferPlan,
} from '@arkade-os/solver-discovery'
import { ASSET_CARRIER_SATS, findMarket, QUOTE_OPTIONS, validatePlan } from '@arkade-os/swap/protocol'
import { effectiveSolverRouting } from './solverRouting'
import { solverUsage } from './swapRecords'
import { solverHealth } from './solverHealth'

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
  const prefs = {
    ...effectiveSolverRouting(network, direction, candidates),
    deprioritized: await solverHealth.deprioritized({ network, direction }),
  }
  const enabled = orderSolverMarkets(candidates, { network, preferences: prefs })
  if (!enabled.length) throw new Error('No enabled solver for this direction')
  const usage = prefs.mode === 'usage' ? await solverUsage(network, direction).catch(() => undefined) : undefined
  const decimals = (enabled[0].give === 'base' ? enabled[0].card.base_asset : enabled[0].card.quote_asset).decimals
  const ordered = await rankSolverMarkets(enabled, {
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
    let feedRequested = false
    try {
      const plan = await quoteOffer(card, {
        give,
        giveAmount: amount,
        carrierSats: ASSET_CARRIER_SATS,
        fetchImpl: async (input, init) => {
          feedRequested = true
          return fetchImpl(input, init)
        },
        signal,
        ...QUOTE_OPTIONS,
      })
      // Preview eligibility checks bounds and dust; the composer checks the actual wallet balance.
      if (!validatePlan(plan, plan.deposit.atomic, dust)) return plan
      invalidPlan ??= plan
      lastError = new Error('Amount outside solver bounds')
    } catch (error) {
      if (signal?.aborted) throw error
      const aborted = error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
      if (feedRequested && !aborted)
        await solverHealth.record({ network, direction }, solverId(card, network), 'failure')
      lastError = error
    }
  }
  if (invalidPlan) return invalidPlan
  throw lastError
}
