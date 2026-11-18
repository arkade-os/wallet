import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'

interface ModalProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onExitComplete?: () => void
}

export default function Modal({ children, open = true, onOpenChange, onExitComplete }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onOpenChange)
  close.current = onOpenChange

  useEffect(() => {
    if (!open) return
    panel.current?.focus({ preventScroll: true })
    // Escape closes the dialog, and focus returns to whatever opened it.
    const opener = document.activeElement as HTMLElement | null
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current?.(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open ? (
        <motion.div
          key='modal-overlay'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
          onClick={() => onOpenChange?.(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'var(--scrim)',
          }}
        />
      ) : null}
      {open ? (
        <motion.div
          key='modal-content'
          initial={{ opacity: 0, x: '-50%', y: '-50%', scale: 0.95 }}
          animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
          exit={{ opacity: 0, x: '-50%', y: '-50%', scale: 0.95 }}
          transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            zIndex: 51,
            width: '100%',
            maxWidth: 'min(22rem, 90%)',
          }}
        >
          <div
            role='dialog'
            aria-modal='true'
            tabIndex={-1}
            ref={panel}
            style={{
              padding: '1.5rem',
              borderRadius: '1.75rem',
              backgroundColor: 'var(--sheet-bg)',
              color: 'var(--fg)',
              outline: 'none',
            }}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
