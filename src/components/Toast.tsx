import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
  leaving: boolean
}

interface ToastContextValue {
  toast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const toast = useCallback((message: string) => {
    const id = nextId++
    setItems((prev) => [...prev, { id, message, leaving: false }])

    const dismissTimer = setTimeout(() => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      const removeTimer = setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
        timers.current.delete(id)
      }, 200)
      timers.current.set(id, removeTimer)
    }, 2000)

    timers.current.set(id, dismissTimer)
  }, [])

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={containerStyle}>
        {items.map((item) => (
          <ToastMessage key={item.id} message={item.message} leaving={item.leaving} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastMessage({ message, leaving }: { message: string; leaving: boolean }) {
  return (
    <div
      style={{
        ...toastStyle,
        animation: leaving ? 'toast-out 150ms ease-out forwards' : 'toast-in 250ms ease-out forwards',
      }}
    >
      {message}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 'calc(12px + env(safe-area-inset-top, 0px))',
  left: '16px',
  right: '16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  zIndex: 99999,
  pointerEvents: 'none',
}

const toastStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  padding: '14px 20px',
  borderRadius: '12px',
  backgroundColor: 'var(--toast-bg)',
  boxShadow: 'var(--elevation-lg)',
  color: 'var(--toast-color)',
  fontSize: '15px',
  fontWeight: 500,
  textAlign: 'center',
  pointerEvents: 'auto',
  letterSpacing: '-0.01em',
}
