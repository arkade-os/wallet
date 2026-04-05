import { createContext, useState, useCallback, useEffect, useContext, useMemo, useRef, type ReactNode } from 'react'
import {
  getSwaps,
  addSwap as addSwapToStore,
  updateSwap as updateSwapInStore,
  deduplicateSwaps,
  type BancoSwap,
} from '../lib/banco'
import { RestIndexerProvider } from '@arkade-os/sdk'
import { AspContext } from './asp'
import { consoleError } from '../lib/logs'

interface BancoContextProps {
  swaps: BancoSwap[]
  addSwap: (swap: BancoSwap) => void
  updateSwap: (id: string, updates: Partial<BancoSwap>) => void
  reload: () => void
  selectedSwapId: string | null
  setSelectedSwapId: (id: string | null) => void
}

export const BancoContext = createContext<BancoContextProps>({
  swaps: [],
  addSwap: () => {},
  updateSwap: () => {},
  reload: () => {},
  selectedSwapId: null,
  setSelectedSwapId: () => {},
})

/** Check VTXOs at the given scripts and update swap statuses accordingly. */
async function checkSwapStatuses(
  indexer: RestIndexerProvider,
  pendingScripts: Map<string, string>, // pkScript hex → swap ID
): Promise<boolean> {
  if (pendingScripts.size === 0) return false

  const scripts = [...pendingScripts.keys()]
  const { vtxos } = await indexer.getVtxos({ scripts, spendableOnly: false })

  // Group vtxos by script
  const byScript = new Map<string, typeof vtxos>()
  for (const v of vtxos) {
    if (!v.script) continue
    const list = byScript.get(v.script) ?? []
    list.push(v)
    byScript.set(v.script, list)
  }

  let anyUpdated = false
  for (const [script, swapId] of pendingScripts) {
    const swapVtxos = byScript.get(script)
    if (!swapVtxos || swapVtxos.length === 0) continue

    const hasSwept = swapVtxos.some((v) => v.virtualStatus.state === 'swept')
    const hasSpent = swapVtxos.some((v) => v.isSpent)
    const hasSpendable = swapVtxos.some((v) => !v.isSpent && v.virtualStatus.state !== 'swept')

    if (hasSwept && !hasSpendable) {
      updateSwapInStore(swapId, { status: 'recoverable' })
      anyUpdated = true
    } else if (hasSpent || !hasSpendable) {
      updateSwapInStore(swapId, { status: 'fulfilled' })
      anyUpdated = true
    }
  }

  return anyUpdated
}

export const BancoProvider = ({ children }: { children: ReactNode }) => {
  const [swaps, setSwaps] = useState<BancoSwap[]>(() => {
    deduplicateSwaps()
    return getSwaps()
  })
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null)
  const { aspInfo } = useContext(AspContext)

  const reload = useCallback(() => setSwaps(getSwaps()), [])

  const addSwap = useCallback((swap: BancoSwap) => {
    addSwapToStore(swap)
    setSwaps(getSwaps())
  }, [])

  const updateSwap = useCallback((id: string, updates: Partial<BancoSwap>) => {
    updateSwapInStore(id, updates)
    setSwaps(getSwaps())
  }, [])

  // Derive pending scripts: pkScript hex → swap ID
  const pendingScripts = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of swaps) {
      if (s.status === 'pending' && s.swapPkScript) {
        map.set(s.swapPkScript, s.id)
      }
    }
    return map
  }, [swaps])

  // Stable serialized key so the effect only re-runs when the actual set of scripts changes
  const pendingScriptsKey = useMemo(() => [...pendingScripts.keys()].sort().join(','), [pendingScripts])

  // Track the current subscription ID so addSwap can append scripts without tearing down
  const subscriptionIdRef = useRef<string | null>(null)
  const indexerRef = useRef<RestIndexerProvider | null>(null)

  // SSE subscription for pending swap status changes
  useEffect(() => {
    const serverUrl = aspInfo?.url
    if (!serverUrl || pendingScripts.size === 0) return

    const url = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl
    const indexer = new RestIndexerProvider(url)
    indexerRef.current = indexer
    const abortController = new AbortController()
    let subscriptionId: string | null = null

    const run = async () => {
      try {
        const scripts = [...pendingScripts.keys()]

        // Create subscription and do initial catch-up
        subscriptionId = await indexer.subscribeForScripts(scripts)
        subscriptionIdRef.current = subscriptionId

        // Catch-up poll on startup
        const updated = await checkSwapStatuses(indexer, pendingScripts)
        if (updated) setSwaps(getSwaps())

        // Listen for SSE events
        const subscription = indexer.getSubscription(subscriptionId, abortController.signal)
        for await (const event of subscription) {
          if (abortController.signal.aborted) break

          // Check if any spent/swept vtxos match our pending scripts
          const affectedScripts = new Set<string>()
          for (const v of [...(event.spentVtxos ?? []), ...(event.sweptVtxos ?? [])]) {
            if (v.script && pendingScripts.has(v.script)) {
              affectedScripts.add(v.script)
            }
          }

          if (affectedScripts.size > 0) {
            // Re-check affected swaps via getVtxos for authoritative status
            const affected = new Map<string, string>()
            for (const script of affectedScripts) {
              affected.set(script, pendingScripts.get(script)!)
            }
            try {
              const changed = await checkSwapStatuses(indexer, affected)
              if (changed) setSwaps(getSwaps())
            } catch (err) {
              consoleError(err, 'banco: error checking swap status after SSE event')
            }
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return
        consoleError(err, 'banco: subscription error')
      }
    }

    run()

    return () => {
      abortController.abort()
      if (subscriptionId) {
        indexer.unsubscribeForScripts(subscriptionId).catch((err) => {
          consoleError(err, 'banco: error unsubscribing')
        })
      }
      subscriptionIdRef.current = null
      indexerRef.current = null
    }
  }, [aspInfo?.url, pendingScriptsKey])

  return (
    <BancoContext.Provider value={{ swaps, addSwap, updateSwap, reload, selectedSwapId, setSelectedSwapId }}>
      {children}
    </BancoContext.Provider>
  )
}
