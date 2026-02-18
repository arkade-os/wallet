import InputContainer from './InputContainer'
import { useRef, useEffect } from 'react'
import { IonInput } from '@ionic/react'

interface InputProps {
  focus?: boolean
  label?: string
  name?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  value?: string
}

export default function Input({ focus, label, name, onChange, onEnter, value }: InputProps) {
  const firstRun = useRef(true)
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.setFocus()
    }
  })

  const handleInput = (ev: Event) => {
    const value = (ev.target as HTMLInputElement).value
    onChange(value)
  }

  return (
    <InputContainer label={label}>
      <IonInput
        name={name}
        onIonInput={handleInput}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        ref={input}
        type='text'
        value={value}
      />
    </InputContainer>
  )
}
