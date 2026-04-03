import { createContext, useState, useCallback, type ReactNode } from 'react'
import {
  getSwaps,
  addSwap as addSwapToStore,
  updateSwap as updateSwapInStore,
  deduplicateSwaps,
  type BancoSwap,
} from '../lib/banco'

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

  const reload = useCallback(() => setSwaps(getSwaps()), [])

  const addSwap = useCallback((swap: BancoSwap) => {
    addSwapToStore(swap)
    setSwaps(getSwaps())
  }, [])

  const updateSwap = useCallback((id: string, updates: Partial<BancoSwap>) => {
    updateSwapInStore(id, updates)
    setSwaps(getSwaps())
  }, [])

  return (
    <BancoContext.Provider value={{ swaps, addSwap, updateSwap, reload, selectedSwapId, setSelectedSwapId }}>
      {children}
    </BancoContext.Provider>
  )
}
