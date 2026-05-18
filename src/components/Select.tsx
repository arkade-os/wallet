import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { GreenStatusIcon } from '../icons/Status'
import { useEffect } from 'react'
import Text from './Text'
import { hapticSubtle } from '../lib/haptics'
import { cn } from '@/lib/utils'

interface SelectProps {
  labels?: string[]
  onChange: (value: string) => void
  options: string[]
  selected: string
}

export default function Select({ labels, onChange, options, selected }: SelectProps) {
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
    <RadioGroup value={selected} onValueChange={handleChange} className='flex flex-col !gap-0 !p-0 !m-0'>
      {options.map((option, index) => (
        <label
          key={option}
          data-testid={`select-option-${index}`}
          onClick={(event) => {
            event.preventDefault()
            handleChange(option)
          }}
          className={cn(
            'flex w-full cursor-pointer items-center justify-between',
            'py-[0.8rem] px-0',
            index < options.length - 1 && 'border-b border-neutral-100',
          )}
        >
          <RadioGroupItem
            value={option}
            className='!absolute !-m-px !size-px !border-0 !p-0 opacity-0 pointer-events-none'
          />
          <Text thin>{labels?.[index] ?? option}</Text>
          {option === selected && <GreenStatusIcon small />}
        </label>
      ))}
    </RadioGroup>
  )
}
