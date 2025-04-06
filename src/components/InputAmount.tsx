import { useContext, useEffect, useRef, useState } from 'react'
import { IonInput, IonText } from '@ionic/react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { prettyNumber } from '../lib/format'

interface InputAmountProps {
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  onFocus?: () => void
  right?: JSX.Element
  sats?: number
}

export default function InputAmount({ focus, label, onChange, onEnter, onFocus, right, sats }: InputAmountProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)

  const [error, setError] = useState('')
  const [otherValue, setOtherValue] = useState('')
  const [value, setValue] = useState(useFiat ? toFiat(sats) : sats)

  const firstRun = useRef(true)
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.setFocus()
    }
  })

  useEffect(() => {
    setOtherValue(useFiat ? prettyNumber(fromFiat(value)) : prettyNumber(toFiat(value), 2))
    setError(value ? (value < 0 ? 'Invalid amount' : '') : '')
    onChange(useFiat ? fromFiat(value) : value)
  }, [value])

  const handleInput = (ev: Event) => {
    const value = Number((ev.target as HTMLInputElement).value)
    if (Number.isNaN(value)) return
    setValue(value)
  }

  const leftLabel = useFiat ? config.fiat : 'SATS'
  const rightLabel = `${otherValue} ${useFiat ? 'SATS' : config.fiat}`
  const fontStyle = { color: 'var(--dark50)', fontSize: '13px' }

  return (
    <>
      <InputContainer error={error} label={label} right={right}>
        <IonInput
          onIonFocus={onFocus}
          onIonInput={handleInput}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
          ref={input}
          type='number'
        >
          <IonText slot='start' style={{ ...fontStyle, marginRight: '0.5rem' }}>
            {leftLabel}
          </IonText>
          <IonText slot='end' style={{ ...fontStyle, marginLeft: '0.5rem' }}>
            {rightLabel}
          </IonText>
        </IonInput>
      </InputContainer>
    </>
  )
}
