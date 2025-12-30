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

  const input = useRef<HTMLIonInputElement>(null)

  // focus input when focus prop changes
  useEffect(() => {
    if (focus && input.current) input.current.setFocus()
  }, [focus, input.current])

  return (
    <InputContainer label={label} right={right}>
      <IonInput
        onIonInput={onChange}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        placeholder={placeholder}
        ref={input}
        type='password'
      >
        <IonInputPasswordToggle color='dark' slot='end' />
      </IonInput>
    </InputContainer>
  )
}
