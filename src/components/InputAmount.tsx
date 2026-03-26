import { useContext, useEffect, useRef, useState } from 'react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { prettyNumber } from '../lib/format'
import { LimitsContext } from '../providers/limits'
import Focusable from './Focusable'
import { unitsToCents } from '../lib/assets'
import { AssetOption } from '../lib/types'

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

  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus])

  useEffect(() => {
    if (asset) return
    setOtherValue(useFiat ? prettyNumber(sats) : prettyNumber(toFiat(sats), fiatDecimals()))
    setError(sats ? (sats < 0 ? 'Invalid amount' : '') : '')
  }, [sats])

  const handleInput = (ev: React.FormEvent<HTMLInputElement>) => {
    const value = Number((ev.target as HTMLInputElement).value)
    if (Number.isNaN(value)) return
    onSats(asset?.assetId ? unitsToCents(value, asset.decimals) : useFiat ? fromFiat(value) : value)
  }

  const minimumSats = min ? Math.max(min, minSwapAllowed()) : 0
  const maximumSats = max ? Math.min(max, maxSwapAllowed()) : 0

  const leftLabel = asset?.assetId ? asset.ticker : useFiat ? config.fiat : 'SATS'
  const rightLabel = asset?.assetId ? '' : `${otherValue} ${useFiat ? 'SATS' : config.fiat}`
  const fontStyle: React.CSSProperties = { color: 'var(--dark50)', fontSize: '13px' }
  const bottomLeft = minimumSats ? `Min: ${prettyNumber(minimumSats)} ${minimumSats === 1 ? 'SAT' : 'SATS'}` : ''
  const bottomRight = maximumSats ? `Max: ${prettyNumber(maximumSats)} ${maximumSats === 1 ? 'SAT' : 'SATS'}` : ''

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: readOnly ? 'var(--dark50)' : 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    outline: 'none',
    padding: '0.5rem 0',
    width: '100%',
  }

  return (
    <>
      <InputContainer error={error} label={label} right={right} bottomLeft={bottomLeft} bottomRight={bottomRight}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <span style={{ ...fontStyle, marginRight: '0.5rem' }}>{leftLabel}</span>
          <input
            disabled={disabled}
            name={name}
            onFocus={onFocus}
            onInput={handleInput}
            onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
            readOnly={readOnly}
            ref={input}
            type='text'
            inputMode='decimal'
            value={value}
            style={inputStyle}
          />
          <span style={{ ...fontStyle, marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>{rightLabel}</span>
          {onMax && !disabled && !readOnly ? (
            <Focusable onEnter={onMax} fit>
              <span
                role='button'
                onClick={onMax}
                aria-label='Set maximum amount'
                data-testid='input-amount-max'
                style={{ ...fontStyle, marginLeft: '0.5rem', color: 'var(--purpletext)', cursor: 'pointer' }}
              >
                Max
              </span>
            </Focusable>
          ) : null}
        </div>
      </InputContainer>
    </>
  )
}
