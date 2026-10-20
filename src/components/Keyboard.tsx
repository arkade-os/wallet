import Header from './Header'
import Content from './Content'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import Text, { TextSecondary } from './Text'
import { FiatContext } from '../providers/fiat'
import { fromSatoshis, prettyAmount, prettyFiatAmount, prettyNumber, toSatoshis } from '../lib/format'
import { WalletContext } from '../providers/wallet'
import { defaultFee } from '../lib/constants'
import ErrorMessage from './Error'
import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import { ConfigContext } from '../providers/config'
import FlexCol from './FlexCol'
import SwapIcon from '../icons/Swap'
import { AssetOption, Currencies, Unit } from '../lib/types'
import { atomicToUnits, prettyAssetAmount, unitsToAtomic } from '../lib/assets'
import { useTranslation } from '../providers/language'
import { MAX_SATS, digitsToValue, popDigit, pushDigit, valueToDigits } from '../lib/keypadEntry'

export type KeyboardInputMode = 'sats' | 'fiat' | 'asset' | 'btc'

interface KeyboardProps {
  asset?: AssetOption
  back: () => void
  /** Starting denomination for bitcoin entry; the ⇅ toggle still switches.
   * Omitted → the wallet-wide useFiat flag decides (fiat-first). */
  defaultMode?: Exclude<KeyboardInputMode, 'asset'>
  hideBalance?: boolean
  onSave: (value: string, inputMode: KeyboardInputMode) => void
  onClear?: () => void
  initialValue?: bigint | number
}

export default function Keyboard({
  asset,
  back,
  defaultMode,
  hideBalance,
  onClear,
  onSave,
  initialValue,
}: KeyboardProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat, fiatDecimals } = useContext(FiatContext)
  const { availableBalance: available } = useContext(WalletContext)
  const { t } = useTranslation()

  const [assetInCents, setAssetInCents] = useState(BigInt(0))
  const [amountInSats, setAmountInSats] = useState(0)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<KeyboardInputMode>('sats')
  const getMaxDecimals = () => {
    switch (inputMode) {
      case 'asset':
        return asset?.decimals ?? 0
      case 'fiat':
        return fiatDecimals()
      case 'btc':
        return 8
      case 'sats':
      default:
        return 0
    }
  }

  const [digits, setDigits] = useState('')
  const textValue = digitsToValue(digits, getMaxDecimals())
  const setFromValue = (value: string) => setDigits(value ? valueToDigits(value, getMaxDecimals()) : '')
  const currencyConversionUseful = config.currency !== Currencies.BTC && toFiat(100_000_000) > 0 && fromFiat(1) > 0
  const previousCurrencyConversionUseful = useRef(currencyConversionUseful)
  const defaultInputMode: KeyboardInputMode = asset?.assetId
    ? 'asset'
    : currencyConversionUseful
      ? (defaultMode ?? (useFiat ? 'fiat' : config.unit === Unit.BTC ? 'btc' : 'sats'))
      : config.unit === Unit.BTC
        ? 'btc'
        : 'sats'

  useEffect(() => {
    setInputMode(defaultInputMode)
  }, [defaultInputMode])

  useEffect(() => {
    if (previousCurrencyConversionUseful.current !== currencyConversionUseful && inputMode !== defaultInputMode) {
      setFromValue('')
    }
    previousCurrencyConversionUseful.current = currencyConversionUseful
  }, [currencyConversionUseful, defaultInputMode, inputMode])

  useEffect(() => {
    if (initialValue && inputMode && toFiat && fiatDecimals) {
      if (inputMode === 'asset') {
        // plain decimal string: grouped output would fail the save gate's Number()
        setFromValue(atomicToUnits(BigInt(initialValue), asset?.decimals ?? 0))
      } else if (inputMode === 'fiat') {
        setFromValue(prettyNumber(toFiat(Number(initialValue)), fiatDecimals(), false))
      } else if (inputMode === 'btc') {
        setFromValue(prettyNumber(fromSatoshis(Number(initialValue)), 8, false))
      } else {
        setFromValue(prettyNumber(Number(initialValue), 0, false))
      }
    }
  }, [initialValue, inputMode, asset, toFiat, fiatDecimals])

  useEffect(() => {
    const strValue = textValue.replaceAll(',', '')
    if (inputMode === 'asset' && asset) {
      setAssetInCents(unitsToAtomic(strValue, asset.decimals))
    } else {
      setAmountInSats(
        inputMode === 'fiat'
          ? fromFiat(Number(strValue))
          : inputMode === 'btc'
            ? toSatoshis(Number(strValue))
            : Number(strValue),
      )
    }
  }, [digits, inputMode, textValue])

  const handleKeyPress = (k: string) => {
    if (k === 'x') return setDigits(popDigit)
    const bitcoin = inputMode === 'sats' || inputMode === 'btc'
    setDigits((prev) => pushDigit(prev, k, getMaxDecimals(), bitcoin ? MAX_SATS : undefined))
  }

  const handleMaxPress = () => {
    if (asset) {
      const { balance, decimals } = asset
      // plain decimal string: toLocaleString grouping breaks Number() parsing
      setFromValue(atomicToUnits(balance, decimals))
      return
    } else {
      const maxSats = available - defaultFee
      const maxTextValue =
        inputMode === 'fiat' ? toFiat(maxSats) : inputMode === 'sats' ? maxSats : fromSatoshis(maxSats)
      setFromValue(prettyNumber(maxTextValue, getMaxDecimals(), false))
    }
  }

  const handleToggleCurrency = () => {
    if (inputMode === 'asset') return // No toggle for assets
    if (inputMode === 'sats' || inputMode === 'btc') {
      setDigits(
        amountInSats ? valueToDigits(prettyNumber(toFiat(amountInSats), fiatDecimals(), false), fiatDecimals()) : '',
      )
      setInputMode('fiat')
    } else {
      const next = config.unit === Unit.BTC ? 'btc' : 'sats'
      const value = next === 'btc' ? prettyNumber(fromSatoshis(amountInSats), 8, false) : String(amountInSats)
      setDigits(amountInSats ? valueToDigits(value, next === 'btc' ? 8 : 0) : '')
      setInputMode(next)
    }
  }

  const handleSave = () => {
    if (!textValue || Number.isNaN(Number(textValue))) {
      setError(t('send.invalidAmount'))
      return
    }
    onSave(textValue, inputMode)
  }

  const prettyBitcoinAmount = (sats: number) => {
    return config.unit === Unit.BTC
      ? prettyAmount(fromSatoshis(sats), config.unit, 8)
      : prettyAmount(sats, config.unit, 0)
  }

  const btcPrimary = (value: string): ReactNode => {
    const shown = value || '0.00000000'
    const lead = shown.match(/^[0.]*/)?.[0] ?? ''
    return (
      <>
        <span className='text-neutral-500'>{lead}</span>
        {shown.slice(lead.length)} {config.unit}
      </>
    )
  }

  // Display amounts based on input mode
  const amount = {
    primary:
      inputMode === 'asset'
        ? `${textValue || '0'} ${asset?.ticker}`
        : inputMode === 'fiat'
          ? prettyFiatAmount(amountInSats ? toFiat(amountInSats) : 0, config.currency, {
              bitcoinUnit: config.unit,
            })
          : inputMode === 'btc'
            ? btcPrimary(textValue)
            : `${textValue || '0'} ${config.unit}`,
    secondary: !useFiat
      ? ''
      : inputMode === 'fiat'
        ? prettyBitcoinAmount(amountInSats)
        : prettyFiatAmount(amountInSats ? toFiat(amountInSats) : 0, config.currency, {
            bitcoinUnit: config.unit,
          }),
    balance:
      inputMode === 'asset'
        ? `${prettyAssetAmount(asset?.balance ?? BigInt(0), asset?.decimals ?? 0)} ${asset?.ticker}`
        : inputMode === 'fiat'
          ? prettyFiatAmount(toFiat(available), config.currency, { bitcoinUnit: config.unit })
          : prettyBitcoinAmount(available),
  }

  // over-balance paints the amount red, matching the swap composer; the
  // available>0 gate avoids a false red before the wallet loads
  const overBalance =
    inputMode === 'asset'
      ? Boolean(asset) && assetInCents > (asset?.balance ?? BigInt(0))
      : available > 0 && amountInSats > available

  const disabled = !amountInSats && !assetInCents

  const gridStyle = {
    borderTop: '1px solid var(--neutral-500)',
    marginTop: '0.5rem',
    width: '100%',
  }

  const rowStyle = {
    display: 'flex',
    fontSize: '1.5rem',
    padding: '1rem',
  }

  const keyStyle = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    cursor: 'pointer',
  }

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'x'],
  ]

  const showSecondaryValue = !asset?.assetId && currencyConversionUseful

  return (
    <>
      <Header
        auxAriaLabel={showSecondaryValue ? t('components.toggleCurrency') : undefined}
        auxFunc={showSecondaryValue ? handleToggleCurrency : undefined}
        auxIcon={showSecondaryValue ? <SwapIcon /> : undefined}
        back={back}
        text={t('common.amount')}
      />
      <Content>
        <FlexCol centered gap='0.5rem'>
          <ErrorMessage error={Boolean(error)} text={error} />
          <Text big centered heading color={overBalance ? 'red' : undefined} testId='keyboard-amount'>
            {amount.primary}
          </Text>
          {showSecondaryValue ? <TextSecondary centered>≈ {amount.secondary}</TextSecondary> : null}
          {hideBalance ? null : (
            <div onClick={handleMaxPress}>
              <TextSecondary centered>{amount.balance}</TextSecondary>
            </div>
          )}
        </FlexCol>
      </Content>
      <div style={gridStyle}>
        {keys.map((row) => (
          <div style={rowStyle} key={row[0]}>
            {row.map((key) =>
              key ? (
                <div style={keyStyle} key={key} onClick={() => handleKeyPress(key)}>
                  <p data-testid={`keyboard-${key}`}>{key === 'x' ? <>&larr;</> : key}</p>
                </div>
              ) : (
                <div style={keyStyle} key='blank' />
              ),
            )}
          </div>
        ))}
      </div>
      <ButtonsOnBottom>
        <Button label={t('common.save')} disabled={disabled} onClick={handleSave} testId='save-amount' />
        {onClear ? (
          <Button label={t('components.clearAmount')} onClick={onClear} secondary testId='clear-amount' />
        ) : null}
      </ButtonsOnBottom>
    </>
  )
}
