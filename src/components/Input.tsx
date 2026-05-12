import InputContainer from './InputContainer'
import { useRef, useEffect, ChangeEventHandler } from 'react'

interface InputProps {
  focus?: boolean
  label?: string
  max?: string
  maxLength?: number
  min?: string
  name?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  placeholder?: string
  right?: JSX.Element
  step?: string
  testId?: string
  type?: 'text' | 'number' | 'url'
  value?: string | number
}

export default function Input({
  focus,
  label,
  max,
  maxLength,
  min,
  name,
  onChange,
  onEnter,
  placeholder,
  right,
  step,
  testId,
  type = 'text',
  value,
}: InputProps) {
  const firstRun = useRef(true)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.focus()
    }
  })

  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    const v = ev.currentTarget.value
    onChange(type === 'number' ? Number(v) : v)
  }

  return (
    <InputContainer label={label} right={right}>
      <input
        max={max}
        min={min}
        ref={input}
        step={step}
        type={type}
        value={value}
        className='input'
        data-testid={testId}
        name={name ?? testId}
        maxLength={maxLength}
        onChange={handleChange}
        placeholder={placeholder}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
      />
    </InputContainer>
  )
}
