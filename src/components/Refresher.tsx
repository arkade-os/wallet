import { WalletContext } from '../providers/wallet'
import { useContext, useEffect, useState } from 'react'
import { consoleError } from '../lib/logs'
import SpinnerIcon from '../icons/Spinner'
import { sleep } from '../lib/sleep'

export default function Refresher() {
  const { reloadWallet, svcWallet } = useContext(WalletContext)

  const [showRefresh, setShowRefresh] = useState(false)

  useEffect(() => {
    let xxx = false
    let touchstartY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchstartY = e.touches[0].clientY
    }
    document.addEventListener('touchstart', handleTouchStart)

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY
      const touchDiff = touchY - touchstartY
      if (touchDiff > 0 && window.scrollY === 0) {
        setShowRefresh(true)
        e.preventDefault()
        xxx = true
      }
    }
    document.addEventListener('touchmove', handleTouchMove)

    const handleTouchEnd = () => {
      if (xxx) handleRefresh()
    }
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

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

  return (
    <>
      {showRefresh ? (
        <div className='pull-to-refresh'>
          <SpinnerIcon />
        </div>
      ) : null}
    </>
  )
}
