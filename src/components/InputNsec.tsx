import InputContainer from './InputContainer'

interface InputNsecProps {
  error?: string
  onChange: (arg0: any) => void
}

export default function InputNsec({ error, onChange }: InputNsecProps) {
  return (
    <InputContainer error={error} label='Recovery phrase or private key'>
      <input name='private-key' onChange={onChange} />
    </InputContainer>
  )
}
