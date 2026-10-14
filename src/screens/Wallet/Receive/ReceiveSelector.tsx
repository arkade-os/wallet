import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ChevronDownIcon from '../../../icons/ChevronDown'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { useTranslation } from '../../../providers/language'

export interface SelectorRow {
  id: string
  title: string
  preview?: string
  note?: string
  icon?: ReactNode
}

export default function ReceiveSelector(p: {
  label: string
  icon?: ReactNode
  rows: SelectorRow[]
  active: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  /** Returns true when the pick opened a sheet, which takes focus itself. */
  onPick: (id: string) => boolean | void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const anchor = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const activeRow = useRef<HTMLButtonElement>(null)
  const refocus = useRef(true)
  const wasOpen = useRef(p.open)
  const [box, setBox] = useState({ top: 0, left: 0, width: 0 })
  const { open, onClose } = p

  // Portalled to body: .page's `contain: layout` would otherwise anchor a fixed list to itself, under the footer.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = anchor.current!.getBoundingClientRect()
      setBox({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (open) activeRow.current?.focus()
    else if (wasOpen.current && refocus.current) button.current?.focus()
    wasOpen.current = open
    refocus.current = true
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div ref={anchor}>
      <button
        ref={button}
        type='button'
        aria-expanded={p.open}
        onClick={p.onToggle}
        className='mx-auto flex w-fit max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-neutral-100 py-1.5 pr-2 pl-3 text-sm'
      >
        <span className='shrink-0 text-neutral-500'>{t('receive.showing')}</span>
        {p.icon ? <span className='flex size-4 shrink-0'>{p.icon}</span> : null}
        <span className='truncate font-semibold'>{p.label}</span>
        <span
          className={`shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${p.open ? 'rotate-180' : ''}`}
        >
          <ChevronDownIcon />
        </span>
      </button>
      {createPortal(
        <>
          {p.open ? (
            <div
              className='fixed inset-0 z-40'
              aria-hidden='true'
              data-testid='receive-selector-backdrop'
              onClick={p.onClose}
            />
          ) : null}
          <AnimatePresence>
            {p.open ? (
              <motion.div
                key='methods'
                role='radiogroup'
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -4, pointerEvents: 'none' }}
                transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
                style={{ ...box, maxHeight: `calc(100dvh - ${box.top}px - 0.5rem)` }}
                className='hide-scrollbar fixed z-50 flex flex-col gap-0.5 overflow-y-auto rounded-xl border border-neutral-100 bg-popover p-1 text-popover-foreground shadow-md'
              >
                {p.rows.map((r) => (
                  <button
                    key={r.id}
                    ref={r.id === p.active ? activeRow : undefined}
                    type='button'
                    role='radio'
                    aria-checked={r.id === p.active}
                    onClick={() => {
                      refocus.current = !p.onPick(r.id)
                    }}
                    className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-left ${r.id === p.active ? 'bg-neutral-100' : ''}`}
                  >
                    {r.icon ?? <Radio on={r.id === p.active} />}
                    <span className='flex min-w-0 flex-1 flex-col'>
                      <span className={`text-sm ${r.id === p.active ? 'font-semibold' : ''}`}>{r.title}</span>
                      {r.preview ? <span className='truncate text-xs text-neutral-500'>{r.preview}</span> : null}
                    </span>
                    {r.note ? <span className='shrink-0 text-xs text-neutral-500'>{r.note}</span> : null}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>,
        document.body,
      )}
    </div>
  )
}

export const Radio = ({ on }: { on: boolean }) => (
  <span
    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-[var(--fg)]' : 'border-neutral-500'}`}
  >
    {on ? <span className='size-2 rounded-full bg-[var(--fg)]' /> : null}
  </span>
)
