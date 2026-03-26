import InputContainer from './InputContainer'
import { StrengthLabel } from './Strength'
import { useRef, useEffect, useState } from 'react'

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
  const [showPassword, setShowPassword] = useState(false)

  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus])

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    outline: 'none',
    padding: '0.5rem 0',
    width: '100%',
  }

  const toggleStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--dark50)',
    cursor: 'pointer',
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    textTransform: 'uppercase',
  }

  return (
    <InputContainer label={label} right={right}>
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          onChange={onChange}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
          placeholder={placeholder}
          ref={input}
          type={showPassword ? 'text' : 'password'}
          style={inputStyle}
        />
        <button
          type='button'
          onClick={() => setShowPassword(!showPassword)}
          style={toggleStyle}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
    </InputContainer>
  )
}
