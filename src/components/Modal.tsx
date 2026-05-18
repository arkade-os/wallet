import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT_QUINT_TUPLE } from '../lib/animations'

interface ModalProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onExitComplete?: () => void
}

export default function Modal({ children, open = true, onOpenChange, onExitComplete }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const rolesToBlur = ['banner', 'main', 'tablist']
    for (const role of rolesToBlur) {
      const element = document.querySelector(`[role="${role}"]`) as HTMLElement
      if (element) element.style.filter = 'blur(10px)'
    }
    return () => {
      for (const role of rolesToBlur) {
        const element = document.querySelector(`[role="${role}"]`) as HTMLElement
        if (element) element.style.filter = 'none'
      }
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            style={{
              padding: '1.5rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--neutral-100)',
              backgroundColor: 'var(--background-color)',
            }}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
