import { useEffect, useRef } from 'react'

export function useClearOnBackground(clear: () => void): void {
  const latest = useRef(clear)
  latest.current = clear
  useEffect(() => {
    const reset = () => latest.current()
    const visibility = () => {
      if (document.visibilityState === 'hidden') reset()
    }
    window.addEventListener('arkade-native-paused', reset)
    document.addEventListener('visibilitychange', visibility)
    visibility()
    return () => {
      window.removeEventListener('arkade-native-paused', reset)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
}
