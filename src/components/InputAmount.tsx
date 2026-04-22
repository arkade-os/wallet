import { ChangeEventHandler, useContext, useEffect, useRef, useState } from 'react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { prettyNumber } from '../lib/format'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { LimitsContext } from '../providers/limits'
import Focusable from './Focusable'
import { unitsToCents } from '../lib/assets'
import { AssetOption } from '../lib/types'
import Text, { TextSecondary } from './Text'

interface InputAmountProps {
  asset?: AssetOption
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
  asset,
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
  const { fromFiat, toFiat, fiatDecimals } = useContext(FiatContext)
  const { minSwapAllowed, maxSwapAllowed } = useContext(LimitsContext)

  const [error, setError] = useState('')
  const [otherValue, setOtherValue] = useState('')

  const input = useRef<HTMLInputElement>(null)

  // focus input when focus prop changes
  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus])

  useEffect(() => {
    if (asset?.assetId) return
    setOtherValue(useFiat ? prettyNumber(sats) : prettyNumber(toFiat(sats), fiatDecimals()))
    setError(sats ? (sats < 0 ? 'Invalid amount' : '') : '')
  }, [sats])

  const handleInput: ChangeEventHandler<HTMLInputElement> = (ev) => {
    const value = Number(ev.currentTarget.value)
    if (Number.isNaN(value)) return
    onSats(asset?.assetId ? unitsToCents(value, asset.decimals) : useFiat ? fromFiat(value) : value)
  }

  const minimumSats = min ? Math.max(min, minSwapAllowed()) : 0
  const maximumSats = max ? Math.min(max, maxSwapAllowed()) : 0

  const fiatSymbol = FIAT_SYMBOLS[config.fiat]
  const fiatLabel = fiatSymbol ?? config.fiat

  const leftLabel = asset?.assetId ? asset.ticker : useFiat ? fiatLabel : 'SATS'
  const rightLabel = asset?.assetId
    ? ''
    : useFiat
      ? `${otherValue} SATS`
      : fiatSymbol
        ? `${fiatSymbol}${otherValue}`
        : `${otherValue} ${config.fiat}`
  const fontStyle = { color: 'var(--dark50)', fontSize: '13px' }
  const bottomLeft =
    minimumSats && sats !== undefined && sats < minimumSats
      ? `Min: ${prettyNumber(minimumSats)} ${minimumSats === 1 ? 'SAT' : 'SATS'}`
      : ''
  const bottomRight =
    maximumSats && sats !== undefined && sats > maximumSats
      ? `Max: ${prettyNumber(maximumSats)} ${maximumSats === 1 ? 'SAT' : 'SATS'}`
      : ''

  return (
    <InputContainer error={error} label={label} right={right} bottomLeft={bottomLeft} bottomRight={bottomRight}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
        <TextSecondary>{leftLabel}</TextSecondary>
        <input
          ref={input}
          name={name}
          type='number'
          onFocus={onFocus}
          className='input'
          inputMode='decimal'
          value={value ?? ''}
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleInput}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        />
        <TextSecondary>{rightLabel}</TextSecondary>
      </label>
      {onMax && !disabled && !readOnly ? (
        <Focusable onEnter={onMax} fit>
          <p
            role='button'
            onClick={onMax}
            aria-label='Set maximum amount'
            data-testid='input-amount-max'
            style={{ ...fontStyle, color: 'var(--purpletext)', cursor: 'pointer' }}
          >
            Max
          </p>
        </Focusable>
      ) : null}
    </InputContainer>
  )
}
