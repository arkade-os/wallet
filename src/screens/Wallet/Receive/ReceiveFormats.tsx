import type { ButtonHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import FlexCol from '../../../components/FlexCol'
import SheetModal from '../../../components/SheetModal'
import Text, { TextSecondary } from '../../../components/Text'
import CheckMarkIcon from '../../../icons/CheckMark'
import ChevronDownIcon from '../../../icons/ChevronDown'
import { useTranslation } from '../../../providers/language'

export interface FormatRow {
  id: string
  icon: ReactNode
  title: string
  subtitle?: string
  badge?: string
  compact?: boolean
}

const CARD = 'w-full rounded-3xl bg-neutral-50 px-4'

export default function ReceiveFormats(p: {
  open: boolean
  onClose: () => void
  formats: FormatRow[]
  active: string
  onPick: (id: string) => void
  tokens?: FormatRow[]
  onPickToken?: (id: string) => void
  /** Replaces the formats heading and its hint, for the asset list. */
  title?: string
}) {
  const { t } = useTranslation()
  const title = p.title ?? t('receive.otherFormats')
  const tabStop = p.formats.some((f) => f.id === p.active) ? p.active : p.formats[0]?.id
  return (
    <SheetModal ariaLabel={title} isOpen={p.open} onClose={p.onClose}>
      <div className='hide-scrollbar -mx-1 max-h-[70dvh] overflow-y-auto px-1'>
        <FlexCol gap='1.25rem' padding='0.5rem 0'>
          <FlexCol gap='0.25rem'>
            <Text big bold>
              {title}
            </Text>
            {p.title ? null : <TextSecondary>{t('receive.otherFormatsHint')}</TextSecondary>}
          </FlexCol>
          {/* Arrows move focus only, as in a menu: a pick closes the sheet. */}
          <div role='radiogroup' aria-label={title} onKeyDown={moveRadioFocus} className={CARD}>
            {p.formats.map((f) => (
              <Row
                key={f.id}
                row={f}
                role='radio'
                aria-checked={f.id === p.active}
                tabIndex={f.id === tabStop ? 0 : -1}
                onClick={() => p.onPick(f.id)}
                trailing={<Check on={f.id === p.active} />}
              />
            ))}
          </div>
          {p.tokens?.length ? (
            <FlexCol gap='0.75rem'>
              <FlexCol gap='0.25rem'>
                <Text bold>{t('receive.methodStablecoins')}</Text>
                <TextSecondary>{t('receive.stablecoinsSub')}</TextSecondary>
              </FlexCol>
              <div className={CARD}>
                {p.tokens.map((r) => (
                  <Row key={r.id} row={r} onClick={() => p.onPickToken?.(r.id)} trailing={<Chevron />} />
                ))}
              </div>
            </FlexCol>
          ) : null}
        </FlexCol>
      </div>
    </SheetModal>
  )
}

export function FormatsCard({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  const row = {
    id: 'formats',
    icon: <LinesIcon />,
    title: t('receive.otherFormats'),
    subtitle: t('receive.otherFormatsSub'),
    compact: true,
  }
  return (
    <div className={CARD}>
      <Row row={row} onClick={onClick} aria-haspopup='dialog' trailing={<Chevron />} />
    </div>
  )
}

function Row({
  row,
  trailing,
  ...button
}: { row: FormatRow; trailing: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type='button'
      {...button}
      className='flex w-full cursor-pointer items-center gap-3 border-b border-neutral-100 py-3.5 text-left last:border-b-0 focus-visible:outline-2 focus-visible:outline-purple-700'
    >
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-background' aria-hidden='true'>
        {row.icon}
      </span>
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='flex items-center gap-2 font-semibold'>
          {row.title}
          {row.badge ? (
            <span className='rounded-full bg-background px-2 py-0.5 text-xs font-medium'>{row.badge}</span>
          ) : null}
        </span>
        {row.subtitle ? (
          <span className={`text-sm text-neutral-500 ${row.compact ? 'truncate' : ''}`}>{row.subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </button>
  )
}

const Check = ({ on }: { on: boolean }) => (
  <span
    className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-3.5 ${on ? 'border-purple-700 bg-purple-700 text-white' : 'border-neutral-300'}`}
  >
    {on ? <CheckMarkIcon small /> : null}
  </span>
)

const Chevron = () => (
  <span className='shrink-0 -rotate-90' aria-hidden='true'>
    <ChevronDownIcon />
  </span>
)

const LinesIcon = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    stroke='currentColor'
    strokeWidth='1.5'
    strokeLinecap='round'
  >
    <path d='M4 6h12M4 10h12M4 14h7' />
  </svg>
)

const STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }

/** Arrow keys, Home and End move focus between a radiogroup's radios. */
export const moveRadioFocus = (e: ReactKeyboardEvent<HTMLElement>) => {
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')]
  const i = items.indexOf(e.target as HTMLElement)
  const step = STEPS[e.key]
  const next =
    i < 0
      ? -1
      : e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : step
            ? (i + step + items.length) % items.length
            : -1
  if (next < 0) return
  e.preventDefault()
  items[next].focus()
}
