import { useContext, useEffect, useRef, useState } from 'react'
import { IonInput, IonText } from '@ionic/react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { prettyNumber } from '../lib/format'
import { LimitsContext } from '../providers/limits'

interface InputAmountProps {
  disabled?: boolean
  focus?: boolean
  label?: string
  min?: number
  max?: number
  onChange: (arg0: any) => void
  onEnter?: () => void
  onFocus?: () => void
  onMax?: () => void
  readOnly?: boolean
  right?: JSX.Element
  value?: number
}

export default function InputAmount({
  disabled,
  focus,
  label,
  min,
  max,
  onChange,
  onEnter,
  onFocus,
  onMax,
  readOnly,
  right,
  value,
}: InputAmountProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { minSwapAllowed, maxSwapAllowed } = useContext(LimitsContext)

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
    setOtherValue(useFiat ? prettyNumber(fromFiat(value)) : prettyNumber(toFiat(value), 2))
    setError(value ? (value < 0 ? 'Invalid amount' : '') : '')
  }, [value])

  const handleInput = (ev: Event) => {
    const value = Number((ev.target as HTMLInputElement).value)
    if (Number.isNaN(value)) return
    onChange(value)
  }

  const minimumSats = min ? Math.max(min, minSwapAllowed()) : 0
  const maximumSats = max ? Math.min(max, maxSwapAllowed()) : 0

  const leftLabel = useFiat ? config.fiat : 'SATS'
  const rightLabel = `${otherValue} ${useFiat ? 'SATS' : config.fiat}`
  const fontStyle = { color: 'var(--dark50)', fontSize: '13px' }
  const bottomLeft = minimumSats ? `Min: ${prettyNumber(minimumSats)} ${minimumSats === 1 ? 'SAT' : 'SATS'}` : ''
  const bottomRight = maximumSats ? `Max: ${prettyNumber(maximumSats)} ${maximumSats === 1 ? 'SAT' : 'SATS'}` : ''

  return (
    <>
      <InputContainer error={error} label={label} right={right} bottomLeft={bottomLeft} bottomRight={bottomRight}>
        <IonInput
          disabled={disabled}
          onIonFocus={onFocus}
          onIonInput={handleInput}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
          readonly={readOnly}
          ref={input}
          type='number'
          value={value}
        >
          <IonText slot='start' style={{ ...fontStyle, marginRight: '0.5rem' }}>
            {leftLabel}
          </IonText>
          <IonText slot='end' style={{ ...fontStyle, marginLeft: '0.5rem' }}>
            {rightLabel}
          </IonText>
          {onMax ? (
            <IonText
              slot='end'
              style={{ ...fontStyle, marginLeft: '0.5rem', color: 'var(--purpletext)', cursor: 'pointer' }}
              onClick={onMax}
            >
              Max
            </IonText>
          ) : null}
        </IonInput>
      </InputContainer>
    </>
  )
}
