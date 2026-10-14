import type { ReactNode } from 'react'
import ChevronDownIcon from '../../../icons/ChevronDown'
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
  onPick: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <button
        type='button'
        aria-expanded={p.open}
        onClick={p.onToggle}
        className='mx-auto flex w-fit max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-neutral-100 py-1.5 pr-2 pl-3 text-sm'
      >
        <span className='shrink-0 text-neutral-500'>{t('receive.showing')}</span>
        {p.icon ? <span className='flex size-4 shrink-0'>{p.icon}</span> : null}
        <span className='truncate font-semibold'>{p.label}</span>
        <span className={`shrink-0 ${p.open ? 'rotate-180' : ''}`}>
          <ChevronDownIcon />
        </span>
      </button>
      {p.open ? (
        <div role='radiogroup' className='flex flex-col gap-0.5'>
          {p.rows.map((r) => (
            <button
              key={r.id}
              type='button'
              role='radio'
              aria-checked={r.id === p.active}
              onClick={() => p.onPick(r.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left ${r.id === p.active ? 'bg-neutral-100' : ''}`}
            >
              {r.icon ?? <Radio on={r.id === p.active} />}
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className={`text-sm ${r.id === p.active ? 'font-semibold' : ''}`}>{r.title}</span>
                {r.preview ? <span className='truncate text-xs text-neutral-500'>{r.preview}</span> : null}
              </span>
              {r.note ? <span className='shrink-0 text-xs text-neutral-500'>{r.note}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}

export const Radio = ({ on }: { on: boolean }) => (
  <span
    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${on ? 'border-[var(--fg)]' : 'border-neutral-500'}`}
  >
    {on ? <span className='size-2 rounded-full bg-[var(--fg)]' /> : null}
  </span>
)
