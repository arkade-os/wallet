import { useContext, useEffect, useRef, useState } from 'react'
import { IonInput, IonText } from '@ionic/react'
import { FiatContext } from '../providers/fiat'
import { prettyAmount } from '../lib/format'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'

interface InputAmountProps {
  focus?: boolean
  label?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  onFocus?: () => void
  right?: JSX.Element
  value?: number
}

export default function InputAmount({ focus, label, onChange, onEnter, onFocus, right, value }: InputAmountProps) {
  const { config } = useContext(ConfigContext)
  const { fromUSD, toUSD } = useContext(FiatContext)

  const [error, setError] = useState('')
  const [otherValue, setOtherValue] = useState('')

  const firstRun = useRef(true)
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.setFocus()
    }
  })

  useEffect(() => {
    const val = config.showFiat ? fromUSD(value) : value
    setOtherValue(prettyAmount(val, true, !config.showFiat, toUSD))
    setError(value ? (value < 0 ? 'Invalid amount' : '') : '')
  }, [value])

  const handleInput = (ev: Event) => {
    const newValue = Number((ev.target as HTMLInputElement).value)
    if (Number.isNaN(newValue)) return
    onChange(newValue)
  }

  return (
    <>
      <InputContainer error={error} label={label} right={right}>
        <IonInput
          onIonFocus={onFocus}
          onIonInput={handleInput}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
          ref={input}
          type='number'
          value={value ? value : undefined}
        >
          {config.showFiat ? (
            <IonText slot='start' style={{ color: 'var(--dark50)', fontSize: '13px' }}>
              USD &nbsp;
            </IonText>
          ) : null}
          <IonText slot='end' style={{ color: 'var(--dark50)', fontSize: '13px' }}>
            &nbsp; {otherValue}
          </IonText>
        </IonInput>
      </InputContainer>
    </>
  )
}
