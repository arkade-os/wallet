import { useId, useState } from 'react'
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox'
import { hapticLight } from '../lib/haptics'
import Text from './Text'

interface CheckboxProps {
  onChange: () => void
  text: string
}

export default function Checkbox({ onChange, text }: CheckboxProps) {
  const checkboxId = useId()
  const [checked, setChecked] = useState(false)

  const handleChange = (nextChecked: boolean) => {
    if (nextChecked === checked) return
    setChecked(nextChecked)
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
