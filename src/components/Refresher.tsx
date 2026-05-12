import { useContext, useEffect, useRef, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import { consoleError } from '../lib/logs'
import SpinnerIcon from '../icons/Spinner'
import { sleep } from '../lib/sleep'

export default function Refresher() {
  const { reloadWallet, svcWallet } = useContext(WalletContext)

  const [showRefresh, setShowRefresh] = useState(false)

  const touchstartY = useRef(0)
  const startScrollTop = useRef(0)
  const triggered = useRef(false)

  const getActiveScrollContainer = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null
    return target.closest<HTMLElement>('.content')?.querySelector<HTMLElement>('.content-shell') ?? null
  }

  const handleTouchStart = (e: TouchEvent) => {
    const scrollEl = getActiveScrollContainer(e.target)
    touchstartY.current = e.touches[0].clientY
    startScrollTop.current = scrollEl?.scrollTop ?? 0
    triggered.current = false
  }

  const handleTouchMove = (e: TouchEvent) => {
    const scrollEl = getActiveScrollContainer(e.target)
    if (!scrollEl || startScrollTop.current > 0 || scrollEl.scrollTop > 0) return

    const touchY = e.touches[0].clientY
    const touchDiff = touchY - touchstartY.current
    if (touchDiff > 50) {
      setShowRefresh(true)
      if (e.cancelable) e.preventDefault()
      triggered.current = true
    }
  }

  const handleTouchEnd = () => {
    if (triggered.current) handleRefresh()
    triggered.current = false
  }

  const handleRefresh = async () => {
    try {
      await svcWallet?.reload()
      await reloadWallet()
    } catch (err) {
      consoleError(err, 'Failed to reload wallet')
    } finally {
      await sleep(1000)
      setShowRefresh(false)
    }
  }

  useEffect(() => {
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <div className={`pull-to-refresh ${showRefresh ? 'show' : ''}`}>
      <SpinnerIcon />
    </div>
  )
}
