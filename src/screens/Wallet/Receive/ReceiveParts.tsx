import { motion } from 'framer-motion'
import Button from '../../../components/Button'
import CopyIcon from '../../../icons/Copy'
import CheckMarkIcon from '../../../icons/CheckMark'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import { EASE_OUT_QUINT_TUPLE } from '../../../lib/animations'
import { prettyLongText } from '../../../lib/format'
import type { PartId, ReceiveMethod, ReceivePart } from '../../../lib/receive/receiveTargets'
import { useTranslation } from '../../../providers/language'
import { Radio } from './ReceiveSelector'

// Copy buttons keep the ids the E2E helpers and screen tests already click.
const testIdOf = (id: PartId, method: ReceiveMethod): string =>
  ({
    link: 'bip21',
    lnaddress: 'lnaddress',
    lnurl: 'lnaddress',
    invoice: 'invoice',
    ark: 'ark',
    btc: 'btc',
    deposit: 'token',
    amount: method === 'token' ? 'token-amount' : 'amount',
  })[id]

export default function ReceiveParts(p: {
  method: ReceiveMethod
  label: string
  parts: ReceivePart[]
  titleOf: (part: ReceivePart) => string
  inQr?: PartId
  copied: string
  onShow: (id: PartId) => void
  onCopy: (value: string) => void
}) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <div
      role={p.parts.some((part) => part.selectable) ? 'radiogroup' : undefined}
      aria-label={p.label}
      className='flex flex-col gap-1'
    >
      {p.parts.map((part) => {
        const on = part.id === p.inQr
        const title = p.titleOf(part)
        return (
          <div
            key={part.id}
            onClick={part.selectable ? () => p.onShow(part.id) : undefined}
            onKeyDown={(e) => {
              if (part.selectable && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                p.onShow(part.id)
              }
            }}
            tabIndex={part.selectable ? 0 : undefined}
            role={part.selectable ? 'radio' : undefined}
            aria-checked={part.selectable ? on : undefined}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${on ? 'border-neutral-500 bg-neutral-100' : 'border-transparent'} ${part.selectable ? 'cursor-pointer' : ''}`}
          >
            {part.selectable ? <Radio on={on} /> : <span className='size-4 shrink-0' />}
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='flex items-center gap-2 text-xs text-neutral-500'>
                {title}
                {on ? (
                  <motion.span
                    initial={reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, ease: EASE_OUT_QUINT_TUPLE }}
                    className='rounded bg-[var(--fg)] px-1.5 py-px text-[10px] font-semibold text-[var(--bg)] uppercase'
                  >
                    {t('receive.inQr')}
                  </motion.span>
                ) : null}
              </span>
              <span
                className={`truncate text-sm ${part.id === 'amount' || part.id === 'lnaddress' ? 'font-semibold' : 'font-mono'}`}
              >
                {part.id === 'amount' || part.id === 'lnaddress' ? part.value : prettyLongText(part.value, 14)}
              </span>
            </span>
            <Button
              copy
              ariaLabel={t('receive.copyAria', { title })}
              testId={`${testIdOf(part.id, p.method)}-address-copy`}
              onClick={(event) => {
                event.stopPropagation()
                p.onCopy(part.value)
              }}
            >
              {p.copied === part.value ? <CheckMarkIcon /> : <CopyIcon />}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
