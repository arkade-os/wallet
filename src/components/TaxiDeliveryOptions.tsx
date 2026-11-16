import { useId, useRef, useState } from 'react'
import ChevronDownIcon from '../icons/ChevronDown'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

type DeliveryOption = { value: string; label: string; description: string; cost?: string; disabled?: boolean }

export default function TaxiDeliveryOptions({
  value,
  options,
  onChange,
  description,
  disabled,
  testId,
}: {
  value: string
  options: DeliveryOption[]
  onChange: (value: string) => void
  description?: string
  disabled?: boolean
  testId?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const chosen = options.find((option) => option.value === value)
  return (
    <div>
      <button
        ref={trigger}
        type='button'
        data-testid={testId}
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between gap-3 rounded-md py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
      >
        <span className='flex min-w-0 items-center gap-2'>
          <span className='text-muted-foreground'>Delivery</span>
          <span className='truncate font-medium'>{chosen?.label}</span>
        </span>
        <span className='flex items-center gap-3'>
          {chosen?.cost ? <span className='whitespace-nowrap text-muted-foreground'>{chosen.cost}</span> : null}
          <span aria-hidden='true' className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </span>
      </button>
      {open ? (
        <div className='mt-2 rounded-lg border border-border p-3'>
          <RadioGroup
            id={id}
            aria-label='Delivery options'
            value={value}
            disabled={disabled}
            onValueChange={(next) => {
              onChange(String(next))
              setOpen(false)
              trigger.current?.focus()
            }}
          >
            {options.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-lg border p-3 ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${value === option.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
              >
                <RadioGroupItem
                  value={option.value}
                  disabled={option.disabled}
                  aria-labelledby={`${id}-${option.value}-label`}
                  aria-describedby={`${id}-${option.value}-description`}
                  className='mt-0.5'
                  onClick={() => {
                    if (value === option.value) {
                      setOpen(false)
                      trigger.current?.focus()
                    }
                  }}
                />
                <span className='flex min-w-0 flex-1 flex-col gap-1'>
                  <span className='flex items-center justify-between gap-3 text-sm font-medium'>
                    <span id={`${id}-${option.value}-label`}>{option.label}</span>
                    {option.cost ? <span className='shrink-0'>{option.cost}</span> : null}
                  </span>
                  <span
                    id={`${id}-${option.value}-description`}
                    className='text-sm leading-relaxed text-muted-foreground'
                  >
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {description ? <p className='mt-3 text-sm text-muted-foreground'>{description}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
