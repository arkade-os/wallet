import InputContainer from './InputContainer'
import { Input as ShadcnInput } from './ui/input'
import { useRef, useEffect } from 'react'

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

  const handleInput = (ev: React.FormEvent<HTMLInputElement>) => {
    const v = (ev.target as HTMLInputElement).value
    onChange(type === 'number' ? Number(v) : v)
  }

  return (
    <InputContainer label={label} right={right}>
      <ShadcnInput
        max={max}
        maxLength={maxLength}
        min={min}
        name={name}
        onInput={handleInput}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        placeholder={placeholder}
        ref={input}
        step={step}
        type={type}
        value={value}
        data-testid={testId}
        className='border-none shadow-none focus-visible:ring-0 bg-transparent px-0'
      />
    </InputContainer>
  )
}
