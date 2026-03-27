import { WalletContext } from '../providers/wallet'
import { useContext, useRef, useState, useCallback } from 'react'

export function useRefresher(scrollRef: React.RefObject<HTMLElement | null>) {
  const { reloadWallet, svcWallet } = useContext(WalletContext)
  const [refreshing, setRefreshing] = useState(false)
  const [pullOffset, setPullOffset] = useState(0)
  const startY = useRef(0)
  const isPulling = useRef(false)
  const threshold = 80

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (scrollRef.current && scrollRef.current.scrollTop > 0) return
      startY.current = e.touches[0].clientY
      isPulling.current = true
    },
    [scrollRef],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current) return
      if (scrollRef.current && scrollRef.current.scrollTop > 0) return
      const dist = Math.max(0, e.touches[0].clientY - startY.current)
      // Suppress native pull-to-refresh when we're handling it
      if (dist > 0) e.preventDefault()
      // Dampen the pull (feels more native)
      setPullOffset(Math.min(dist * 0.4, 100))
    },
    [scrollRef],
  )

  const handleTouchEnd = useCallback(async () => {
    if (pullOffset >= threshold * 0.4) {
      setRefreshing(true)
      setPullOffset(0)
      await svcWallet?.reload()
      await reloadWallet()
      setRefreshing(false)
    } else {
      setPullOffset(0)
    }
    isPulling.current = false
  }, [pullOffset, svcWallet, reloadWallet])

  return { handleTouchStart, handleTouchMove, handleTouchEnd, refreshing, pullOffset }
}
