import { useState, useEffect } from 'react'

const isServer = (): boolean => typeof window === 'undefined'

const isStandalone = () => navigator.standalone || window.matchMedia('(display-mode: standalone)').matches

export const pwaCanInstall = () => 'serviceWorker' in navigator && !isServer() && !isStandalone()

export const pwaIsInstalled = () => !isServer() && isStandalone()

export function usePwaInstalled(): boolean {
  const [installed, setInstalled] = useState(() => pwaIsInstalled())

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setInstalled(true)
    }
    mq.addEventListener('change', handleChange)

    const handleInstall = () => setInstalled(true)
    window.addEventListener('appinstalled', handleInstall)

    return () => {
      mq.removeEventListener('change', handleChange)
      window.removeEventListener('appinstalled', handleInstall)
    }
  }, [])

  return installed
}

// beforeinstallprompt — Android native install prompt
// Captured at module level so the one-shot event is never missed (fires early in page lifecycle,
// potentially before the Wallet screen mounts).

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let _deferredPrompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _deferredPrompt = e as BeforeInstallPromptEvent
  })
}

export const canPromptInstall = () => _deferredPrompt !== null

export const promptPwaInstall = async () => {
  if (!_deferredPrompt) return
  const p = _deferredPrompt
  _deferredPrompt = null
  await p.prompt()
  await p.userChoice
}
