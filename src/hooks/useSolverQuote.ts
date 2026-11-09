import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { stableStringify, type DiscoveredMarket, type OfferPlan } from '@arkade-os/solver-discovery'
import { ASSET_CARRIER_SATS, makeCachedFeedFetch } from '@arkade-os/swap/protocol'
import { getSolverRoutingVersion, subscribeSolverRouting } from '@/lib/solverRouting'
import { previewSolverQuote } from '@/lib/solverQuote'

type QuoteState = { key: string; plan: OfferPlan | null; status: 'idle' | 'loading' | 'success' | 'error' }
export const useSolverQuote = (
  markets: DiscoveredMarket[],
  from: string,
  to: string | undefined,
  network: string,
  dust: bigint = ASSET_CARRIER_SATS,
) => {
  const [amount, setAmount] = useState('')
  const [state, setState] = useState<QuoteState>()
  const version = useSyncExternalStore(subscribeSolverRouting, getSolverRoutingVersion, getSolverRoutingVersion)
  const feedFetch = useMemo(() => makeCachedFeedFetch(), [])
  const key = stableStringify({ markets, from, to, network, amount, version, dust: dust.toString() })
  useEffect(() => {
    if (!to || !amount || !network) return
    let active = true
    const controller = new AbortController()
    setState({ key, plan: null, status: 'loading' })
    void previewSolverQuote(markets, from, to, amount, network, feedFetch, controller.signal, dust).then(
      (plan) => {
        if (active) setState({ key, plan, status: 'success' })
      },
      () => {
        if (active) setState({ key, plan: null, status: 'error' })
      },
    )
    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, feedFetch])
  const current = state?.key === key ? state : undefined
  return {
    plan: current?.plan ?? null,
    status: current?.status ?? 'idle',
    solvable: undefined,
    setGiveAmount: setAmount,
  }
}
