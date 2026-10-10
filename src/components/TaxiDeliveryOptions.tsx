import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  const chosen = options.find((option) => option.value === value)
  return (
    <div className='rounded-xl border border-border bg-card p-4 text-card-foreground'>
      <button
        type='button'
        data-testid={testId}
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className='flex w-full items-center justify-between gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
      >
        <span className='flex flex-col gap-1'>
          <span className='text-sm text-muted-foreground'>Taxi delivery</span>
          <span className='font-medium'>{chosen?.label}</span>
        </span>
        <span className='flex items-center gap-3'>
          {chosen?.cost ? (
            <span className='rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary'>{chosen.cost}</span>
          ) : null}
          <ChevronDown
            aria-hidden='true'
            className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open ? (
        <RadioGroup
          id={id}
          aria-label='Taxi delivery options'
          value={value}
          disabled={disabled}
          onValueChange={(next) => onChange(String(next))}
          className='mt-4'
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
      ) : null}
      {description ? <p className='mt-3 text-sm leading-relaxed text-muted-foreground'>{description}</p> : null}
    </div>
  )
}
