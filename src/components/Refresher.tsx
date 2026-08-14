import { useContext, useEffect, useRef, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import { consoleError } from '../lib/logs'
import SpinnerIcon from '../icons/Spinner'
import { sleep } from '../lib/sleep'

export default function Refresher() {
  const { reloadWallet, svcWallet } = useContext(WalletContext)

  const [showRefresh, setShowRefresh] = useState(false)

  const refresherRef = useRef<HTMLDivElement | null>(null)
  const reloadWalletRef = useRef(reloadWallet)
  const svcWalletRef = useRef(svcWallet)
  const triggeredRef = useRef(false)
  const touchstartYRef = useRef(0)

  reloadWalletRef.current = reloadWallet
  svcWalletRef.current = svcWallet

  const handleTouchStart: EventListener = (event) => {
    const e = event as TouchEvent
    touchstartYRef.current = e.touches[0].clientY
  }

  const handleTouchMove: EventListener = (event) => {
    const e = event as TouchEvent
    const currentTarget = e.currentTarget as HTMLElement | null
    const distToTop = currentTarget?.scrollTop ?? 0
    if (touchstartYRef.current > 180) return
    const touchY = e.touches[0].clientY
    const touchDiff = touchY - touchstartYRef.current
    if (touchDiff > 100 && distToTop === 0) {
      setShowRefresh(true)
      if (e.cancelable) e.preventDefault()
      triggeredRef.current = true
    }
  }

  const handleTouchEnd: EventListener = () => {
    if (triggeredRef.current) {
      triggeredRef.current = false
      handleRefresh()
    }
  }

  const handleTouchCancel: EventListener = () => {
    triggeredRef.current = false
    setShowRefresh(false)
  }

  const handleRefresh = async () => {
    try {
      await svcWalletRef.current?.reload()
      await reloadWalletRef.current()
    } catch (err) {
      consoleError(err, 'Failed to reload wallet')
    } finally {
      await sleep(1000)
      setShowRefresh(false)
    }
  }

  useEffect(() => {
    const contentEl = refresherRef.current?.closest('.content') as HTMLElement | null
    if (!contentEl) return

    contentEl.addEventListener('touchmove', handleTouchMove, { passive: false })
    contentEl.addEventListener('touchstart', handleTouchStart)
    contentEl.addEventListener('touchend', handleTouchEnd)
    contentEl.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      contentEl.removeEventListener('touchstart', handleTouchStart)
      contentEl.removeEventListener('touchmove', handleTouchMove)
      contentEl.removeEventListener('touchend', handleTouchEnd)
      contentEl.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [])

  return (
    <div ref={refresherRef} className={`pull-to-refresh ${showRefresh ? 'show' : ''}`}>
      <SpinnerIcon />
    </div>
  )
}
