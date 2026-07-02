import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { GreenStatusIcon } from '../icons/Status'
import { useEffect, type ReactNode } from 'react'
import { hapticSubtle } from '../lib/haptics'
import { cn } from '@/lib/utils'

interface SelectProps {
  labels?: string[]
  onChange: (value: string) => void
  options: string[]
  renderStart?: (option: string) => ReactNode
  selected: string
}

export default function Select({ labels, onChange, options, renderStart, selected }: SelectProps) {
  useEffect(() => {
    const handleKeyDown = (event: { key: string; keyCode: number }) => {
      const selectedIndex = options.indexOf(selected)
      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        if (selectedIndex > 0) onChange(options[selectedIndex - 1])
      } else if (event.key === 'ArrowDown' || event.keyCode === 40) {
        if (selectedIndex < options.length - 1) onChange(options[selectedIndex + 1])
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selected, options, onChange])

  const handleChange = (value: string) => {
    hapticSubtle()
    onChange(value)
  }

  return (
    <RadioGroup value={selected} onValueChange={handleChange} className='settings-row-group'>
      {options.map((option, index) => (
        <label
          key={option}
          data-testid={`select-option-${index}`}
          onClick={(event) => {
            event.preventDefault()
            handleChange(option)
          }}
          className={cn(
            'settings-row settings-select-row',
            option === selected && 'settings-select-row--selected',
            index === 0 && 'settings-select-row--first',
          )}
        >
          <RadioGroupItem
            value={option}
            className='!absolute !-m-px !size-px !border-0 !p-0 opacity-0 pointer-events-none'
          />
          <span className='settings-select-row__content'>
            {renderStart ? <span className='settings-select-row__icon'>{renderStart(option)}</span> : null}
            <p className='settings-row__label'>{labels?.[index] ?? option}</p>
          </span>
          {option === selected && <GreenStatusIcon small />}
        </label>
      ))}
    </RadioGroup>
  )
}
