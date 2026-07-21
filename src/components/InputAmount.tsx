import { useContext, useEffect, useRef, useState } from 'react'
import { FiatContext } from '../providers/fiat'
import InputContainer from './InputContainer'
import { ConfigContext } from '../providers/config'
import { fromSatoshis, prettyNumber, toSatoshis } from '../lib/format'
import { FIAT_SYMBOLS } from '../lib/fiat'
import { LimitsContext } from '../providers/limits'
import { AssetOption, Unit } from '../lib/types'
import { TextSecondary } from './Text'
import { hapticLight } from '../lib/haptics'
import { fiatAccountAssetSatoshis } from '../lib/accountAssets'
import { unitsToCents } from '../lib/assets'
import ArrowUpDownIcon from '../icons/ArrowUpDown'

export type InputAmountMode = 'unit' | 'fiat'

interface InputAmountProps {
  asset?: AssetOption
  /** Spendable satoshis — amounts above it paint the insufficient-funds error */
  available?: number
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
  available,
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
  const { minSwapAllowed, maxSwapAllowed } = useContext(LimitsContext)

  const [error, setError] = useState('')
  const [internalMode, setInternalMode] = useState<InputAmountMode>('unit')
  const [otherValue, setOtherValue] = useState('')
  const [satsValue, setSatsValue] = useState(0)

  const input = useRef<HTMLInputElement>(null)

  // A switchable input enters the asset unit until switched (the parent may
  // control the mode so other entry surfaces — the mobile keyboard — stay on
  // the same denomination); a plain one follows the wallet-wide useFiat flag.
  const mode = controlledMode ?? internalMode
  const fiatEntry = switchable ? mode === 'fiat' && useFiat : useFiat

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
    const textValue = ev.currentTarget.value
    onChange(textValue)
    if (asset?.assetId) return
    const value = Number(textValue)
    setSatsValue(fiatEntry ? fromFiat(value) : toSats(value))
  }

  const unitText = (sats: number) =>
    config.unit === Unit.BTC ? prettyNumber(fromSatoshis(sats), 8, false) : prettyNumber(sats, 0, false)

  const handleModeSwitch = () => {
    hapticLight()
    const nextMode: InputAmountMode = mode === 'unit' ? 'fiat' : 'unit'
    // re-express the current amount in the new denomination so the typed text
    // and the parent's parse of it stay in sync
    if (satsValue) {
      onChange(nextMode === 'fiat' ? prettyNumber(toFiat(satsValue), fiatDecimals(), false) : unitText(satsValue))
    }
    setInternalMode(nextMode)
    onModeChange?.(nextMode)
  }

  const minimumSats = min ? Math.max(min, minSwapAllowed()) : 0
  const maximumSats = max ? Math.min(max, maxSwapAllowed()) : 0

  const fiatSymbol = FIAT_SYMBOLS[config.currency]
  const fiatLabel = fiatSymbol ?? config.currency

  // designated-currency assets (USD/BRL accounts) can price their amount in
  // the display currency; other assets have no rate, so no conversion shows.
  // Only plain decimal text converts — a number input can hold "1e5", which
  // unitsToCents' BigInt would throw on.
  const plainDecimalValue = value && /^\d*\.?\d*$/.test(value) ? value : ''
  const assetSatoshis =
    asset?.assetId && plainDecimalValue
      ? fiatAccountAssetSatoshis(
          unitsToCents(plainDecimalValue, asset.decimals),
          asset.decimals,
          asset.ticker,
          fromFiatAmount,
        )
      : undefined
  const assetFiatLabel =
    assetSatoshis !== undefined && useFiat ? `${prettyNumber(toFiat(assetSatoshis), fiatDecimals())} ${fiatLabel}` : ''

  // over-balance paints the insufficient error, matching the swap composer
  const overBalance = asset?.assetId
    ? Boolean(plainDecimalValue) && unitsToCents(plainDecimalValue, asset.decimals) > asset.balance
    : available !== undefined && satsValue > available

  const leftLabel = asset?.assetId ? asset.ticker : fiatEntry ? fiatLabel : config.unit
  const rightLabel = asset?.assetId
    ? assetFiatLabel
    : fiatEntry
      ? `${otherValue} ${config.unit}`
      : switchable && useFiat
        ? `${otherValue} ${fiatLabel}`
        : ''
  const showSwitch = Boolean(switchable && useFiat && !asset?.assetId && !disabled && !readOnly)
  const bottomLeft =
    minimumSats && satsValue !== undefined && satsValue < minimumSats
      ? `Min: ${prettyNumber(minimumSats)} ${minimumSats === 1 ? 'sat' : 'sats'}`
      : ''
  const bottomRight =
    maximumSats && satsValue !== undefined && satsValue > maximumSats
      ? `Max: ${prettyNumber(maximumSats)} ${maximumSats === 1 ? 'sat' : 'sats'}`
      : ''

  return (
    <InputContainer
      error={error || (overBalance ? 'Insufficient funds' : '')}
      label={label}
      right={right}
      bottomLeft={bottomLeft}
      bottomRight={bottomRight}
    >
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
