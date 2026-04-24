import { useRef, useEffect, useState } from 'react'
import InputContainer from './InputContainer'
import { StrengthLabel } from './Strength'
import PasswordIcon from '../icons/Password'

interface InputPasswordProps {
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  placeholder?: string
  strength?: number
}

export default function InputPassword({ focus, label, onChange, onEnter, strength, placeholder }: InputPasswordProps) {
  const [visible, setVisible] = useState(false)

  const input = useRef<HTMLInputElement>(null)

  // focus input when focus prop changes
  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus, input.current])

  const right = strength ? <StrengthLabel strength={strength} /> : undefined

  return (
    <InputContainer label={label} right={right}>
      <label style={{ display: 'flex', alignItems: 'strech', gap: '0.25rem', flex: 1 }}>
        <input
          ref={input}
          name={label}
          className='input'
          onChange={onChange}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        />
      </label>
      <div onClick={() => setVisible(!visible)} style={{ cursor: 'pointer', padding: '12px' }}>
        <PasswordIcon visible={visible} />
      </div>
    </InputContainer>
  )
}
