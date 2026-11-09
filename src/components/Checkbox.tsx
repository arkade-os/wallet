import { useId, useState } from 'react'
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox'
import { hapticLight } from '../lib/haptics'
import Text from './Text'

interface CheckboxProps {
  /** Controlled checked state; omit to keep internal state. */
  checked?: boolean
  onChange: () => void
  text: string
}

export default function Checkbox({ checked: controlled, onChange, text }: CheckboxProps) {
  const checkboxId = useId()
  const [internal, setInternal] = useState(false)
  const checked = controlled ?? internal

  const handleChange = (nextChecked: boolean) => {
    if (nextChecked === checked) return
    if (controlled === undefined) setInternal(nextChecked)
    hapticLight()
    onChange()
  }

  return (
    <label
      htmlFor={checkboxId}
      className='flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-500 p-3'
      data-testid='checkbox'
    >
      <ShadcnCheckbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={handleChange}
        className='size-6 rounded-md data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground'
      />
      <Text small>{text}</Text>
    </label>
  )
}
