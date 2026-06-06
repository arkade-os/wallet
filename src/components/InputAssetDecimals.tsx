import InputContainer from './InputContainer'
import { ChangeEventHandler } from 'react'
import { cn } from '../lib/utils'

interface InputAssetDecimalsProps {
  label?: string
  onChange: (arg0: string) => void
  placeholder?: string
  testId?: string
  value?: string | number
}

export default function InputAssetDecimals({ label, onChange, placeholder, testId, value }: InputAssetDecimalsProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    onChange(ev.currentTarget.value)
  }

  return (
    <InputContainer label={label}>
      <input
        className={cn('input')}
        data-testid={testId}
        inputMode='numeric'
        min='0'
        max='8'
        maxLength={1}
        onChange={handleChange}
        placeholder={placeholder}
        pattern='[0-9]*'
        step={1}
        value={value}
      />
    </InputContainer>
  )
}
