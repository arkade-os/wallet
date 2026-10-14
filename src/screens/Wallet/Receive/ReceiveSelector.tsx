import { useEffect, useRef, type ReactNode } from 'react'
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
  onPick: (id: string) => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const button = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(p.open)
  const { open, onClose } = p

  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus()
    wasOpen.current = open
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className='relative z-20'>
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
      {p.open ? <div className='fixed inset-0 -z-10' aria-hidden='true' onClick={p.onClose} /> : null}
      <AnimatePresence>
        {p.open ? (
          <motion.div
            key='methods'
            role='radiogroup'
            initial={reduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
            // Header, padding, button and footer take 15rem beside the QR's own min(21.25rem, 100dvh - 26rem).
            className='absolute inset-x-0 top-full mt-1 flex max-h-[calc(max(26rem,100dvh-21.25rem)-15rem)] flex-col gap-0.5 overflow-y-auto rounded-xl border border-neutral-100 bg-popover p-1 text-popover-foreground shadow-md'
          >
            {p.rows.map((r) => (
              <button
                key={r.id}
                type='button'
                role='radio'
                aria-checked={r.id === p.active}
                onClick={() => p.onPick(r.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left ${r.id === p.active ? 'bg-neutral-100' : ''}`}
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
