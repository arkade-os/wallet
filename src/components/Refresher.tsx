import { useContext, useEffect, useRef, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import { consoleError } from '../lib/logs'
import SpinnerIcon from '../icons/Spinner'
import { sleep } from '../lib/sleep'

export default function Refresher() {
  const { reloadWallet, svcWallet } = useContext(WalletContext)

  const [showRefresh, setShowRefresh] = useState(false)

  const triggeredRef = useRef(false)
  const touchstartYRef = useRef(0)

  const handleTouchStart = (e: TouchEvent) => {
    touchstartYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (touchstartYRef.current > 180) return
    const touchY = e.touches[0].clientY
    const touchDiff = touchY - touchstartYRef.current
    if (touchDiff > 100 && window.scrollY === 0) {
      setShowRefresh(true)
      if (e.cancelable) e.preventDefault()
      triggeredRef.current = true
    }
  }

  const handleTouchEnd = () => {
    if (triggeredRef.current) {
      triggeredRef.current = false
      handleRefresh()
    }
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
