import { ReactNode, createContext, useCallback, useEffect, useRef, useState } from 'react'

const DEV_MODE_KEY = 'dev_mode'

interface DevModeContextProps {
  devMode: boolean
  handleTap: () => void
}

export const DevModeContext = createContext<DevModeContextProps>({
  devMode: false,
  handleTap: () => {},
})

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState(() => localStorage.getItem(DEV_MODE_KEY) === 'true')
  const tapCountRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleTap = useCallback(() => {
    tapCountRef.current += 1
    clearTimeout(tapTimerRef.current)
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0
      setDevMode((v) => {
        const next = !v
        localStorage.setItem(DEV_MODE_KEY, String(next))
        return next
      })
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0
      }, 600)
    }
  }, [])

  useEffect(() => {
    return () => clearTimeout(tapTimerRef.current)
  }, [])

  return <DevModeContext.Provider value={{ devMode, handleTap }}>{children}</DevModeContext.Provider>
}
