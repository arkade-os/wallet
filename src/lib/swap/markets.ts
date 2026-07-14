import {
  bestMarket,
  discover,
  isNetwork,
  type DiscoveredMarket,
  type OfferPlan,
  type OfferSide,
} from '@arkade-os/solver-discovery'
import { getSolverRegistryUrl } from '../constants'
import { consoleLog } from '../logs'
import { Network } from '@arkade-os/boltz-swap'

export const BTC_ASSET_ID = 'btc'

/** Shared quote options so the react hook and imperative quotes agree. */
export const QUOTE_OPTIONS = { safetyBps: 50 }

/** Markets from the network's solver registry; [] when none is configured. */
export const discoverMarkets = async (network: Network): Promise<DiscoveredMarket[]> => {
  const registry = getSolverRegistryUrl(network)
  if (!registry || !isNetwork(network)) return []
  const { markets, warnings } = await discover({ registries: [registry], network })
  if (warnings.length) consoleLog('solver discovery:', ...warnings)
  return markets
}

/**
 * Best market for a from/to pair. All registry markets are BTC-based, so
 * `give` maps directly: paying BTC deposits the base side, receiving BTC
 * deposits the quote side. No market for asset↔asset pairs.
 */
export const findMarket = (
  markets: DiscoveredMarket[],
  fromId: string,
  toId: string,
): { market: DiscoveredMarket | null; give: OfferSide } | undefined => {
  if (fromId === toId) return undefined
  if (fromId === BTC_ASSET_ID) return { market: bestMarket(markets, { baseId: fromId, quoteId: toId }), give: 'base' }
  if (toId === BTC_ASSET_ID) return { market: bestMarket(markets, { baseId: toId, quoteId: fromId }), give: 'quote' }
  return undefined
}

export type PlanError = 'insufficient-balance' | 'below-min' | 'above-max' | 'below-dust'

/** Validate a plan against the maker's balance and the server dust limit. */
export const validatePlan = (plan: OfferPlan, giveBalance: bigint, dust: bigint): PlanError | undefined => {
  if (plan.deposit.atomic > giveBalance) return 'insufficient-balance'
  if (!plan.limits.withinLimits) {
    return plan.limits.baseAmount.atomic < plan.limits.minBase.atomic ? 'below-min' : 'above-max'
  }
  // the BTC side must survive as a VTXO: deposit when giving BTC, fill output otherwise
  const btcSide = plan.give === 'base' ? plan.deposit.atomic : plan.receive.atomic
  if (btcSide < dust) return 'below-dust'
  return undefined
}
