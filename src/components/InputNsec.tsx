import { ChangeEventHandler } from 'react'
import InputContainer from './InputContainer'

interface InputNsecProps {
  error?: string
  onChange: (arg0: any) => void
}

export default function InputNsec({ error, onChange }: InputNsecProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    onChange(ev.currentTarget.value)
  }
  return (
    <InputContainer error={error} label='Recovery phrase or private key'>
      <input name='private-key' onChange={handleChange} style={{ width: '100%' }} />
    </InputContainer>
  )
}
