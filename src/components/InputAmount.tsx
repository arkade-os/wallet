import { useContext, useEffect, useRef, useState } from 'react'
import { IonInput, IonText } from '@ionic/react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { prettyNumber } from '../lib/format'
import { LimitsContext } from '../providers/limits'
import Focusable from './Focusable'

interface InputAmountProps {
  disabled?: boolean
  focus?: boolean
  label?: string
  min?: number
  max?: number
  name?: string
  onEnter?: () => void
  onFocus?: () => void
  onMax?: () => void
  onSats: (sats: number) => void
  readOnly?: boolean
  right?: JSX.Element
  value?: number
  sats?: number
}

export default function InputAmount({
  disabled,
  focus,
  label,
  min,
  max,
  name,
  onEnter,
  onFocus,
  onMax,
  onSats,
  readOnly,
  right,
  value,
  sats,
}: InputAmountProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { minSwapAllowed, maxSwapAllowed } = useContext(LimitsContext)

  const [error, setError] = useState('')
  const [otherValue, setOtherValue] = useState('')

  const input = useRef<HTMLIonInputElement>(null)

  // focus input when focus prop changes
  useEffect(() => {
    if (focus && input.current) input.current.setFocus()
  }, [focus])

  useEffect(() => {
    setOtherValue(useFiat ? prettyNumber(sats) : prettyNumber(toFiat(sats), 2))
    setError(sats ? (sats < 0 ? 'Invalid amount' : '') : '')
  }, [sats])

  const handleInput = (ev: Event) => {
    const value = Number((ev.target as HTMLInputElement).value)
    if (Number.isNaN(value)) return
    onSats(useFiat ? fromFiat(value) : value)
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
          name={name}
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
        </IonInput>
        {onMax && !disabled && !readOnly ? (
          <Focusable onKeyDown={onMax}>
            <IonText
              slot='end'
              role='button'
              onClick={onMax}
              aria-label='Set maximum amount'
              style={{ ...fontStyle, marginLeft: '0.5rem', color: 'var(--purpletext)', cursor: 'pointer' }}
            >
              Max
            </IonText>
          </Focusable>
        ) : null}
      </InputContainer>
    </>
  )
}
