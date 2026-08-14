import { useContext, useEffect, useRef, useState } from 'react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { fromSatoshis, prettyNumber, toSatoshis } from '../lib/format'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { AssetOption, Currencies, Unit } from '../lib/types'
import { TextSecondary } from './Text'
import { hapticLight } from '../lib/haptics'
import { fiatAccountAssetSatoshis } from '../lib/accountAssets'
import { unitsToCents } from '../lib/assets'
import ArrowUpDownIcon from '../icons/ArrowUpDown'

export type InputAmountMode = 'unit' | 'fiat'

interface InputAmountProps {
  asset?: AssetOption
  disabled?: boolean
  focus?: boolean
  label?: string
  min?: number
  max?: number
  /** Controlled entry denomination; omit to let the input own it */
  mode?: InputAmountMode
  name?: string
  onChange: (value: string) => void
  onEnter?: () => void
  onFocus?: () => void
  onMax?: () => void
  onModeChange?: (mode: InputAmountMode) => void
  readOnly?: boolean
  right?: JSX.Element
  switchable?: boolean
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
  mode: controlledMode,
  name,
  onChange,
  onEnter,
  onFocus,
  onMax,
  onModeChange,
  readOnly,
  right,
  switchable,
  value,
  valueSats,
}: InputAmountProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat, fromFiat, fiatDecimals, fromFiatAmount } = useContext(FiatContext)

  const [error, setError] = useState('')
  const [internalMode, setInternalMode] = useState<InputAmountMode>('unit')
  const [otherValue, setOtherValue] = useState('')
  const [satsValue, setSatsValue] = useState(0)

  const input = useRef<HTMLInputElement>(null)

  // A switchable input enters the asset unit until switched (the parent may
  // control the mode so other entry surfaces — the mobile keyboard — stay on
  // the same denomination); a plain one follows the wallet-wide useFiat flag.
  const mode = controlledMode ?? internalMode
  const currencyConversionUseful = config.currency !== Currencies.BTC && toFiat(100_000_000) > 0 && fromFiat(1) > 0
  const fiatEntry = switchable ? mode === 'fiat' && useFiat && currencyConversionUseful : useFiat

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
    setSatsValue(fiatEntry ? fromFiat(Number(value)) : toSats(Number(value)))
  }, [value, fromFiat, fiatEntry, valueSats])

  // update other value when satsValue change
  useEffect(() => {
    setError(satsValue ? (satsValue < 0 ? 'Invalid amount' : '') : '')
    const useBTC = config.unit === Unit.BTC
    const btcValue = useBTC ? fromSatoshis(satsValue) : satsValue
    const decimals = useBTC ? 8 : 0
    setOtherValue(
      fiatEntry ? prettyNumber(btcValue, decimals, true, decimals) : prettyNumber(toFiat(satsValue), fiatDecimals()),
    )
  }, [satsValue, toFiat, fiatDecimals, fiatEntry])

  const handleAmountChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    // collapse redundant leading zeros ("00.0004" → "0.0004", "007" → "7")
    const textValue = ev.currentTarget.value.replace(/^0+(?=\d)/, '')
    onChange(textValue)
    if (asset?.assetId) return
    const value = Number(textValue)
    setSatsValue(fiatEntry ? fromFiat(value) : toSats(value))
  }

  const handleModeSwitch = () => {
    hapticLight()
    const nextMode: InputAmountMode = mode === 'unit' ? 'fiat' : 'unit'
    setInternalMode(nextMode)
    // the parent re-expresses the value itself from its authoritative sats:
    // pushing re-denominated text through onChange here would be parsed by
    // the parent's pre-switch mode closure — a wrong-amount hazard
    onModeChange?.(nextMode)
  }

  const minimumSats = min ?? 0
  const maximumSats = max ?? 0

  const fiatSymbol = FIAT_SYMBOLS[config.currency]
  const fiatLabel = fiatSymbol ?? config.currency

  // designated-currency assets (USD/BRL accounts) can price their amount in
  // the display currency; other assets have no rate, so no conversion shows.
  // Only trusted (id-verified) assets convert — the ticker is self-reported
  // metadata, and a spoofed "USD" must not borrow the real dollar rate.
  const plainDecimalValue = value && /^\d*\.?\d*$/.test(value) ? value : ''
  const assetSatoshis =
    asset?.assetId && asset.trusted && plainDecimalValue
      ? fiatAccountAssetSatoshis(
          unitsToCents(plainDecimalValue, asset.decimals),
          asset.decimals,
          asset.ticker,
          fromFiatAmount,
        )
      : undefined
  const assetFiatLabel =
    assetSatoshis !== undefined && useFiat && currencyConversionUseful
      ? `${prettyNumber(toFiat(assetSatoshis), fiatDecimals())} ${fiatLabel}`
      : ''

  const leftLabel = asset?.assetId ? asset.ticker : fiatEntry ? fiatLabel : config.unit
  const rightLabel = asset?.assetId
    ? assetFiatLabel
    : fiatEntry
      ? `${otherValue} ${config.unit}`
      : switchable && useFiat && currencyConversionUseful
        ? `${otherValue} ${fiatLabel}`
        : ''
  const showSwitch = Boolean(
    switchable && useFiat && currencyConversionUseful && !asset?.assetId && !disabled && !readOnly,
  )
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
        {showSwitch ? (
          <button
            type='button'
            className='pill-base'
            onClick={handleModeSwitch}
            aria-label={`Enter amount in ${mode === 'unit' ? config.currency : config.unit}`}
            data-testid='input-amount-switch'
          >
            <ArrowUpDownIcon />
          </button>
        ) : null}
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
