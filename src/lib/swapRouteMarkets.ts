import type { NetworkName } from '@arkade-os/sdk'
import { marketCorridor, sideLimits, type DiscoveredMarket } from '@arkade-os/solver-discovery'
import { btcOn, parseAssetId, type AssetId } from '@arkade-os/swap'
import { BTC_ASSET_ID } from '@arkade-os/swap/protocol'
import { isSolverEnabled } from './solverRouting'
import { swapAssetId } from './swapMarkets'
import type { DirectedSwapEdge } from './swapRoutePlan'

export function swapRouteEdges(markets: readonly DiscoveredMarket[], network: NetworkName): DirectedSwapEdge[] {
  return markets.flatMap((market) => {
    if (!market.discovery_pubkey || !market.transports?.nostr?.relays?.length) return []
    const endpoint = (side: 'base' | 'quote') => {
      const corridor = marketCorridor(market, side)
      const id = (side === 'base' ? market.base_asset : market.quote_asset).id
      if (corridor === 'bolt11' && id === BTC_ASSET_ID) return btcOn('bolt11', network)
      if (corridor === 'arkade') return swapAssetId(network, id)
      if (corridor === 'bolt11') return id as AssetId
    }
    try {
      const base = endpoint('base')
      const quote = endpoint('quote')
      if (!base || !quote || parseAssetId(base).reference !== network || parseAssetId(quote).reference !== network)
        return []
      return (
        [
          ['base', 'quote', base, quote],
          ['quote', 'base', quote, base],
        ] as const
      ).flatMap(([give, take, from, to]) =>
        marketCorridor(market, take) === 'arkade' && sideLimits(market, take) && isSolverEnabled(market, give, network)
          ? [{ from, to }]
          : [],
      )
    } catch {
      return []
    }
  })
}
