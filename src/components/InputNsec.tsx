import { ChangeEventHandler, useLayoutEffect, useRef, useState } from 'react'
import InputContainer from './InputContainer'
import { useTranslation } from '../providers/language'
import { completeMnemonicWord } from '../lib/completeMnemonicWord'

interface InputNsecProps {
  error?: string
  onChange: (arg0: any) => void
}

export default function InputNsec({ error, onChange }: InputNsecProps) {
  const { t } = useTranslation()
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaretEnd = useRef(false)

  useLayoutEffect(() => {
    if (pendingCaretEnd.current && inputRef.current) {
      pendingCaretEnd.current = false
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [value])

  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    if ('isComposing' in ev.nativeEvent && ev.nativeEvent.isComposing) {
      return
    }
    const raw = ev.currentTarget.value
    const el = ev.currentTarget
    const atEnd = el.selectionStart === raw.length
    const growing = raw.length > value.length
    let next = raw
    if (growing && atEnd) {
      const completed = completeMnemonicWord(raw)
      if (completed !== raw) {
        pendingCaretEnd.current = true
        next = completed
      }
    }
    setValue(next)
    onChange(next)
  }

  return (
    <InputContainer error={error} label={t('components.recoveryPhraseOrKey')}>
      <input
        ref={inputRef}
        name='private-key'
        value={value}
        onChange={handleChange}
        autoCapitalize='none'
        autoCorrect='off'
        spellCheck={false}
        autoComplete='off'
        style={{ padding: '0.25rem 0', width: '100%' }}
      />
    </InputContainer>
  )
}
