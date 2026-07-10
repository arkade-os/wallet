import { useContext, useEffect, useState } from 'react'
import { DiscoveryError, DiscoveryErrorCode } from '../lib/discovery'
import { discoveryNetwork, discoveryRegistryUrls, quoteSwap, SwapQuoteResult } from '../lib/discovery/wallet'
import { consoleError } from '../lib/logs'
import { AspContext } from '../providers/asp'

const QUOTE_DEBOUNCE_MS = 250

export interface DiscoveryQuoteState {
  /** Live quote priced from the discovered market's pinned feed. */
  quote?: SwapQuoteResult
  loading: boolean
  /** Set when discovery ran but could not price the pair. */
  unavailable?: DiscoveryErrorCode | 'error'
}

const idle: DiscoveryQuoteState = { loading: false }

/**
 * Price a prospective swap via the discovery protocol: merge the followed
 * registries' per-network indexes, take the best market for the pair, and
 * price the deposit from that market's own feed. Idle when the wallet's
 * network has no registry partition or inputs are incomplete.
 */
export function useDiscoveryQuote({
  fromAssetId,
  toAssetId,
  depositAmount,
}: {
  fromAssetId?: string
  toAssetId?: string
  /** Deposit in the from-asset's smallest units. */
  depositAmount: bigint
}): DiscoveryQuoteState {
  const { aspInfo } = useContext(AspContext)
  const [state, setState] = useState<DiscoveryQuoteState>(idle)

  const network = discoveryNetwork(aspInfo.network)
  const enabled = Boolean(network && fromAssetId && toAssetId && depositAmount > BigInt(0))

  useEffect(() => {
    if (!enabled) {
      setState(idle)
      return
    }

    let cancelled = false
    setState((current) => ({ ...current, loading: true }))

    const timer = window.setTimeout(() => {
      quoteSwap({
        fromAssetId: fromAssetId!,
        toAssetId: toAssetId!,
        depositAmount,
        network: network!,
        registryUrls: discoveryRegistryUrls(),
      })
        .then((quote) => {
          if (!cancelled) setState({ quote, loading: false })
        })
        .catch((error) => {
          if (cancelled) return
          consoleError(error, 'discovery quote failed:')
          setState({ loading: false, unavailable: error instanceof DiscoveryError ? error.code : 'error' })
        })
    }, QUOTE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [enabled, fromAssetId, toAssetId, depositAmount, network])

  return state
}
