import InputContainer from './InputContainer'
import { ChangeEventHandler } from 'react'
import { cn } from '../lib/utils'

interface InputAssetAmountProps {
  error?: string
  label?: string
  onChange: (arg0: string) => void
  placeholder?: string
  testId?: string
  value?: string | number
}

export default function InputAssetAmount({
  error,
  label,
  onChange,
  placeholder,
  testId,
  value,
}: InputAssetAmountProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    onChange(ev.currentTarget.value)
  }

  return (
    <InputContainer error={error} label={label}>
      <input
        className={cn('input')}
        data-testid={testId}
        inputMode='numeric'
        maxLength={19}
        onChange={handleChange}
        placeholder={placeholder}
        pattern='[0-9]*'
        value={value}
      />
    </InputContainer>
  )
}
