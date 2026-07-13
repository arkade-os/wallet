import { useContext, useEffect, useRef, useState } from 'react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { formatBitcoinAmountParts, prettyNumber, toSatoshis } from '../lib/format'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { LimitsContext } from '../providers/limits'
import { AssetOption, Unit } from '../lib/types'
import { TextSecondary } from './Text'
import { hapticLight } from '../lib/haptics'

interface InputAmountProps {
  asset?: AssetOption
  disabled?: boolean
  focus?: boolean
  label?: string
  min?: number
  max?: number
  name?: string
  onChange: (value: string) => void
  onEnter?: () => void
  onFocus?: () => void
  onMax?: () => void
  readOnly?: boolean
  right?: JSX.Element
  value?: string
  valueSats?: number
}

export default function InputAmount({
  asset,
  disabled,
  focus,
  label,
  min,
  max,
  name,
  onChange,
  onEnter,
  onFocus,
  onMax,
  readOnly,
  right,
  value,
  valueSats,
}: InputAmountProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat, fromFiat, fiatDecimals } = useContext(FiatContext)
  const { minSwapAllowed, maxSwapAllowed } = useContext(LimitsContext)

  const [error, setError] = useState('')
  const [otherValue, setOtherValue] = useState('')
  const [satsValue, setSatsValue] = useState(0)

  const input = useRef<HTMLInputElement>(null)

  const toSats = (value: number): number => {
    return config.unit === Unit.BTC ? toSatoshis(value) : value
  }

  // focus input when focus prop changes
  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus])

  // valueSats prop has priority over value prop, so update value when valueSats changes
  useEffect(() => {
    if (valueSats === undefined) return
    setSatsValue(valueSats)
  }, [valueSats])

  // update satsValue when value change
  useEffect(() => {
    if (valueSats !== undefined) return
    if (!value || isNaN(Number(value))) return
    setSatsValue(useFiat ? fromFiat(Number(value)) : toSats(Number(value)))
  }, [value, fromFiat, useFiat, valueSats])

  // update other value when satsValue change
  useEffect(() => {
    setError(satsValue ? (satsValue < 0 ? 'Invalid amount' : '') : '')
    const bitcoinAmount =
      config.unit === Unit.BTC ? formatBitcoinAmountParts(satsValue, config.unit).amount : prettyNumber(satsValue, 0)
    setOtherValue(useFiat ? bitcoinAmount : prettyNumber(toFiat(satsValue), fiatDecimals()))
  }, [satsValue, toFiat, fiatDecimals, useFiat])

  const handleAmountChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const textValue = ev.currentTarget.value
    onChange(textValue)
    if (asset?.assetId) return
    const value = Number(textValue)
    setSatsValue(useFiat ? fromFiat(value) : toSats(value))
  }

  const minimumSats = min ? Math.max(min, minSwapAllowed()) : 0
  const maximumSats = max ? Math.min(max, maxSwapAllowed()) : 0

  const fiatSymbol = FIAT_SYMBOLS[config.currency]
  const fiatLabel = useFiat ? (fiatSymbol ?? config.currency) : config.unit

  const leftLabel = asset?.assetId ? asset.ticker : useFiat ? fiatLabel : config.unit
  const rightLabel = !asset?.assetId && useFiat ? `${otherValue} ${config.unit}` : ''
  const bottomLeft =
    minimumSats && satsValue !== undefined && satsValue < minimumSats
      ? `Min: ${prettyNumber(minimumSats)} ${minimumSats === 1 ? 'sat' : 'sats'}`
      : ''
  const bottomRight =
    maximumSats && satsValue !== undefined && satsValue > maximumSats
      ? `Max: ${prettyNumber(maximumSats)} ${maximumSats === 1 ? 'sat' : 'sats'}`
      : ''

  return (
    <InputContainer error={error} label={label} right={right} bottomLeft={bottomLeft} bottomRight={bottomRight}>
      <label className='label'>
        <TextSecondary>{leftLabel}</TextSecondary>
        <input
          ref={input}
          name={name}
          type='number'
          onFocus={onFocus}
          className='input'
          inputMode='decimal'
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleAmountChange}
          value={value ?? ''}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        />
        <TextSecondary>{rightLabel}</TextSecondary>
        {onMax && !disabled && !readOnly ? (
          <button
            type='button'
            className='pill-base'
            onClick={() => {
              hapticLight()
              onMax()
            }}
            aria-label='Set maximum amount'
            data-testid='input-amount-max'
          >
            Max
          </button>
        ) : null}
      </label>
    </InputContainer>
  )
}
