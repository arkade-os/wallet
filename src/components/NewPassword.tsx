import { useEffect, useState } from 'react'
import InputPassword from './InputPassword'
import FlexCol from './FlexCol'
import CheckList from './CheckList'
import { StrengthBars, calcStrength } from './Strength'
import { useTranslation } from '../providers/language'

interface NewPasswordProps {
  setLabel: (label: string) => void
  onNewPassword: (password: string | null) => void
}

export default function NewPassword({ onNewPassword, setLabel }: NewPasswordProps) {
  const { t } = useTranslation()
  const [confirm, setConfirm] = useState('')
  const [focus, setFocus] = useState('password')
  const [password, setPassword] = useState('')
  const [strength, setStrength] = useState(0)

  useEffect(() => {
    onNewPassword(password === confirm ? password : null)
    if (!password) return setLabel(t('components.noPasswordYolo'))
    if (password !== confirm) return setLabel(t('components.passwordsMustMatch'))
    setLabel(t('components.savePassword'))
  }, [password, confirm])

  const handleChangePassword = (e: any) => {
    const pass = e.target.value
    setStrength(calcStrength(pass))
    setPassword(pass)
  }

  const handleChangeConfirm = (e: any) => setConfirm(e.target.value)

  const handleEnter = () => {
    if (!password) setFocus('password')
    else if (!confirm) setFocus('confirm')
  }

  const passwordChecks = [
    {
      text: t('components.passwordMinChars'),
      done: password.length > 7,
    },
    {
      text: t('components.passwordOneNumber'),
      done: /\d/.test(password),
    },
    {
      text: t('components.passwordSpecialChar'),
      done: /\W/.test(password),
    },
  ]

  return (
    <FlexCol gap='1.5em'>
      <FlexCol testId='new-password'>
        <InputPassword
          focus={focus === 'password'}
          label={t('components.password')}
          onChange={handleChangePassword}
          onEnter={handleEnter}
        />
        <StrengthBars strength={strength} />
        <CheckList data={passwordChecks} />
      </FlexCol>
      <FlexCol testId='confirm-password'>
        <InputPassword
          focus={focus === 'confirm'}
          label={t('components.confirmPassword')}
          onChange={handleChangeConfirm}
          onEnter={handleEnter}
        />
      </FlexCol>
    </FlexCol>
  )
}
