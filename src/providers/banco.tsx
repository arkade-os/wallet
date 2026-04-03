import { createContext, useState, useCallback, useEffect, useContext, useRef, type ReactNode } from 'react'
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

const POLL_INTERVAL_MS = 10_000 // 10 seconds
const MAX_POLL_INTERVAL_MS = 120_000 // 2 minutes (backoff cap)

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

export const BancoProvider = ({ children }: { children: ReactNode }) => {
  const [swaps, setSwaps] = useState<BancoSwap[]>(() => {
    deduplicateSwaps()
    return getSwaps()
  })
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null)
  const { aspInfo } = useContext(AspContext)
  const pollInterval = useRef(POLL_INTERVAL_MS)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const reload = useCallback(() => setSwaps(getSwaps()), [])

  const addSwap = useCallback((swap: BancoSwap) => {
    addSwapToStore(swap)
    setSwaps(getSwaps())
    // Reset poll interval when a new swap is created
    pollInterval.current = POLL_INTERVAL_MS
  }, [])

  const updateSwap = useCallback((id: string, updates: Partial<BancoSwap>) => {
    updateSwapInStore(id, updates)
    setSwaps(getSwaps())
  }, [])

  // Poll pending swaps for status changes
  useEffect(() => {
    const pollPending = async () => {
      const current = getSwaps()
      const pending = current.filter((s) => s.status === 'pending')
      if (pending.length === 0) return

      const serverUrl = aspInfo?.url
      if (!serverUrl) return

      const url = serverUrl.startsWith('http') ? serverUrl : 'http://' + serverUrl
      const indexer = new RestIndexerProvider(url)

      let anyUpdated = false
      for (const swap of pending) {
        try {
          const { vtxos } = await indexer.getVtxos({ scripts: [swap.swapPkScript], spendableOnly: false })
          if (vtxos.length === 0) continue

          const hasSwept = vtxos.some((v) => v.virtualStatus.state === 'swept')
          const hasSpent = vtxos.some((v) => v.isSpent)
          const hasSpendable = vtxos.some((v) => !v.isSpent && v.virtualStatus.state !== 'swept')

          if (hasSwept && !hasSpendable) {
            updateSwapInStore(swap.id, { status: 'recoverable' })
            anyUpdated = true
          } else if (hasSpent || !hasSpendable) {
            updateSwapInStore(swap.id, { status: 'fulfilled' })
            anyUpdated = true
          }
        } catch (err) {
          consoleError(err, 'banco poll error for swap ' + swap.id)
        }
      }

      if (anyUpdated) {
        setSwaps(getSwaps())
        // Reset interval on state change
        pollInterval.current = POLL_INTERVAL_MS
      } else {
        // Backoff: increase interval up to max
        pollInterval.current = Math.min(pollInterval.current * 1.5, MAX_POLL_INTERVAL_MS)
      }
    }

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await pollPending()
        schedule()
      }, pollInterval.current)
    }

    schedule()
    return () => clearTimeout(timerRef.current)
  }, [aspInfo?.url])

  return (
    <BancoContext.Provider value={{ swaps, addSwap, updateSwap, reload, selectedSwapId, setSelectedSwapId }}>
      {children}
    </BancoContext.Provider>
  )
}
