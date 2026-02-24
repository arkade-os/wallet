import InputContainer from './InputContainer'
import { useRef, useEffect } from 'react'
import { IonInput } from '@ionic/react'

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
  value?: string
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
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.setFocus()
    }
  })

  const handleInput = (ev: Event) => {
    const v = (ev.target as HTMLInputElement).value
    onChange(v)
  }

  return (
    <InputContainer label={label} right={right}>
      <IonInput
        max={max}
        maxlength={maxLength}
        min={min}
        name={name}
        onIonInput={handleInput}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        placeholder={placeholder}
        ref={input}
        step={step}
        type={type}
        value={value}
        data-testid={testId}
      />
    </InputContainer>
  )
}
