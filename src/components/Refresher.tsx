import { useContext, useEffect, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import { consoleError } from '../lib/logs'
import SpinnerIcon from '../icons/Spinner'
import { sleep } from '../lib/sleep'

export default function Refresher() {
  const { reloadWallet } = useContext(WalletContext)

  const [showRefresh, setShowRefresh] = useState(false)

  let touchstartY = 0
  let triggered = false

  const handleTouchStart = (e: TouchEvent) => {
    touchstartY = e.touches[0].clientY
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (touchstartY > 180) return
    const touchY = e.touches[0].clientY
    const touchDiff = touchY - touchstartY
    if (touchDiff > 100 && window.scrollY === 0) {
      setShowRefresh(true)
      if (e.cancelable) e.preventDefault()
      triggered = true
    }
  }

  const handleTouchEnd = () => {
    if (triggered) handleRefresh()
  }

  const handleRefresh = async () => {
    try {
      await reloadWallet({ forceRuntimeReload: true })
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
