import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'
import { holdBackLayer } from '../providers/navigation'

interface ModalProps {
  /** Accessible name of the dialog. */
  label?: string
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onExitComplete?: () => void
}

export default function Modal({ label, children, open = true, onOpenChange, onExitComplete }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onOpenChange)
  close.current = onOpenChange

  useEffect(() => {
    if (!open) return
    // Taken before focus moves into the panel, or there is nothing to return it to.
    const opener = document.activeElement as HTMLElement | null
    panel.current?.focus({ preventScroll: true })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return close.current?.(false)
      if (event.key !== 'Tab' || !panel.current) return
      // Tab stays inside the dialog while it is open.
      const stops = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!stops.length) return event.preventDefault()
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    // Back closes the dialog instead of leaving the screen underneath it.
    const release = holdBackLayer(() => close.current?.(false))
    return () => {
      document.removeEventListener('keydown', onKey)
      release()
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
            aria-label={label}
            data-modal-layer=''
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
