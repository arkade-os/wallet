import { useEffect, useState } from 'react'
import InputPassword from './InputPassword'
import FlexCol from './FlexCol'
import CheckList from './CheckList'
import { calcStrength, StrengthProgress } from './Strength'

interface NewPasswordProps {
  setLabel: (label: string) => void
  onNewPassword: (password: string | null) => void
}

export default function NewPassword({ onNewPassword, setLabel }: NewPasswordProps) {
  const [confirm, setConfirm] = useState('')
  const [focus, setFocus] = useState('password')
  const [password, setPassword] = useState('')
  const [strength, setStrength] = useState(0)

  useEffect(() => {
    onNewPassword(password === confirm ? password : null)
    if (!password) return setLabel('No password, YOLO')
    if (password !== confirm) return setLabel('Passwords must match')
    setLabel('Save password')
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
      text: '8 characters minimum',
      done: password.length > 7,
    },
    {
      text: 'contain at least 1 number',
      done: /\d/.test(password),
    },
    {
      text: 'contain at least 1 special character',
      done: /\W/.test(password),
    },
  ]

  return (
    <FlexCol gap='1.5em'>
      <FlexCol>
        <InputPassword
          focus={focus === 'password'}
          label='Password'
          onChange={handleChangePassword}
          onEnter={handleEnter}
        />
        <StrengthProgress strength={strength} />
        <CheckList data={passwordChecks} />
      </FlexCol>
      <InputPassword
        focus={focus === 'confirm'}
        label='Confirm password'
        onChange={handleChangeConfirm}
        onEnter={handleEnter}
      />
    </FlexCol>
  )
}
