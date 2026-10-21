import Button from '../../../components/Button'
import CopyIcon from '../../../icons/Copy'
import CheckMarkIcon from '../../../icons/CheckMark'
import { prettyLongText } from '../../../lib/format'
import type { PartId, ReceiveMethod, ReceivePart } from '../../../lib/receive/receiveTargets'
import { useTranslation } from '../../../providers/language'
import { Radio, moveRadioFocus } from './ReceiveSelector'

// Copy buttons keep the ids the E2E helpers and screen tests already click.
const testIdOf = (id: PartId, method: ReceiveMethod): string =>
  ({
    link: 'bip21',
    lnaddress: 'lnaddress',
    lnurl: 'lnurl',
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
  const choices = p.parts.filter((part) => part.selectable)
  const tabStop = choices.some((c) => c.id === p.inQr) ? p.inQr : choices[0]?.id
  return (
    <div
      role={choices.length ? 'radiogroup' : undefined}
      aria-label={p.label}
      onKeyDown={(e) => {
        const next = moveRadioFocus(e)
        if (next >= 0) p.onShow(choices[next].id)
      }}
      className='flex flex-col gap-1'
    >
      {p.parts.map((part) => {
        const on = part.id === p.inQr
        const title = p.titleOf(part)
        return (
          <div
            key={part.id}
            className={`flex items-center gap-3 rounded-lg pr-3 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${on ? 'bg-neutral-100' : ''}`}
          >
            {/* A radio's children are presentational, so the copy button sits beside it, not inside. */}
            <div
              onClick={part.selectable ? () => p.onShow(part.id) : undefined}
              onKeyDown={(e) => {
                if (part.selectable && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  p.onShow(part.id)
                }
              }}
              tabIndex={part.selectable ? (part.id === tabStop ? 0 : -1) : undefined}
              role={part.selectable ? 'radio' : undefined}
              aria-checked={part.selectable ? on : undefined}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pl-3 ${part.selectable ? 'cursor-pointer' : ''}`}
            >
              {part.selectable ? <Radio on={on} /> : <span className='size-4 shrink-0' />}
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='text-xs text-neutral-500'>{title}</span>
                <span
                  className={`truncate text-sm ${part.id === 'amount' || part.id === 'lnaddress' ? 'font-semibold' : 'font-mono'}`}
                >
                  {part.id === 'amount' || part.id === 'lnaddress' ? part.value : prettyLongText(part.value, 14)}
                </span>
              </span>
            </div>
            <Button
              copy
              ariaLabel={t('receive.copyAria', { title })}
              testId={`${testIdOf(part.id, p.method)}-address-copy`}
              onClick={() => p.onCopy(part.value)}
            >
              {p.copied === part.value ? <CheckMarkIcon /> : <CopyIcon />}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
