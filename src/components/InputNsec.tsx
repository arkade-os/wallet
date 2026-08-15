import { ChangeEventHandler } from 'react'
import InputContainer from './InputContainer'
import { useTranslation } from '../providers/language'

interface InputNsecProps {
  error?: string
  onChange: (arg0: any) => void
}

export default function InputNsec({ error, onChange }: InputNsecProps) {
  const { t } = useTranslation()
  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    onChange(ev.currentTarget.value)
  }
  return (
    <InputContainer error={error} label={t('components.recoveryPhraseOrKey')}>
      <input name='private-key' onChange={handleChange} style={{ padding: '0.25rem 0', width: '100%' }} />
    </InputContainer>
  )
}
