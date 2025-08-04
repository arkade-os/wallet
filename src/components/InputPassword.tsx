import InputContainer from './InputContainer'
import { IonInput, IonInputPasswordToggle } from '@ionic/react'
import { StrengthLabel } from './Strength'
import { useRef, useEffect } from 'react'

interface InputPasswordProps {
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  placeholder?: string
  strength?: number
}

export default function InputPassword({ focus, label, onChange, onEnter, strength, placeholder }: InputPasswordProps) {
  const right = strength ? <StrengthLabel strength={strength} /> : undefined

  const firstRun = useRef(true)
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.setFocus()
    }
  })

  return (
    <InputContainer label={label} right={right}>
      <IonInput
        onIonInput={onChange}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        placeholder={placeholder}
        ref={input}
        type='password'
      >
        <IonInputPasswordToggle slot='end' />
      </IonInput>
    </InputContainer>
  )
}
