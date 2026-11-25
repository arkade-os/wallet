import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { FiatContext } from '../providers/fiat'
import {
  canConvertCurrency,
  fromSatoshis,
  prettyAmount,
  prettyFiatAmount,
  prettyLongText,
  prettyNumber,
  toSatoshis,
} from '../lib/format'
import Glyph from '../icons/Glyph'
import Figure from './Figure'
import AddressPattern from './AddressPattern'
import { hapticSubtle } from '../lib/haptics'
import { WalletContext } from '../providers/wallet'
import { defaultFee } from '../lib/constants'
import ErrorMessage from './Error'
import Button from './Button'
import { ConfigContext } from '../providers/config'
import { AssetOption, Unit } from '../lib/types'
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
  recipient?: string
  saveLabel?: string
  onMax?: () => void
  title?: string
  subtitle?: string
}

export default function Keyboard({
  asset,
  back,
  defaultMode,
  hideBalance,
  onClear,
  onSave,
  initialValue,
  recipient,
  saveLabel,
  onMax,
  title,
  subtitle,
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
  const currencyConversionUseful = canConvertCurrency(config.currency, toFiat, fromFiat)
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
  }, [initialValue, inputMode, asset?.assetId, asset?.decimals, toFiat, fiatDecimals])

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

  const overBalance = hideBalance
    ? false
    : inputMode === 'asset'
      ? Boolean(asset) && assetInCents > (asset?.balance ?? BigInt(0))
      : available > 0 && amountInSats > available

  const disabled = !amountInSats && !assetInCents

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'x']

  const showSecondaryValue = !asset?.assetId && currencyConversionUseful

  const pressKey = (key: string) => {
    hapticSubtle()
    handleKeyPress(key)
  }

  const length = typeof amount.primary === 'string' ? amount.primary.length : (textValue || '0.00000000').length + 4
  const figureSize = length <= 6 ? 84 : length <= 8 ? 72 : length <= 11 ? 56 : length <= 15 ? 42 : 32

  return (
    <div className='amount-screen'>
      <header className='header'>
        <div className='header__side'>
          <button
            type='button'
            className='icon-button'
            onClick={back}
            aria-label={t('components.close')}
            data-testid='header-back-btn'
          >
            <Glyph name='close' size={22} strokeWidth={2} />
          </button>
        </div>
        {recipient ? (
          <div className='amount-screen__chip'>
            <AddressPattern value={recipient} size={28} />
            <span>{prettyLongText(recipient, 8)}</span>
          </div>
        ) : (
          <h1 className='title'>{title ?? t('common.amount')}</h1>
        )}
        <div className='header__side header__side--end' />
      </header>
      <section className='amount-screen__figure' aria-label={title ?? t('common.amount')}>
        <ErrorMessage error={Boolean(error)} text={error} />
        {subtitle ? <p className='text-sm text-ink-3'>{subtitle}</p> : null}
        <p
          className='amount-screen__value'
          style={{ fontSize: figureSize }}
          aria-live='polite'
          data-testid='keyboard-amount'
        >
          {typeof amount.primary === 'string' ? <Figure value={amount.primary} /> : amount.primary}
          <span className='amount-screen__caret' aria-hidden='true' />
        </p>
        {showSecondaryValue ? (
          <button
            type='button'
            className='amount-screen__toggle'
            onClick={handleToggleCurrency}
            aria-label={t('components.toggleCurrency')}
            data-testid='header-aux-btn'
          >
            <Glyph name='arrowUpDown' size={15} strokeWidth={2.25} />
            {amount.secondary}
          </button>
        ) : null}
        {overBalance ? (
          <p className='amount-screen__warning' role='status'>
            <Glyph name='info' size={16} strokeWidth={2} />
            {t('components.moreThanBalance')}
          </p>
        ) : null}
      </section>
      {hideBalance ? null : (
        <div className='amount-screen__available'>
          <p>
            {t('components.availableBalance')} <span>{amount.balance}</span>
          </p>
          <button type='button' data-testid='keyboard-max' onClick={onMax ?? handleMaxPress}>
            {t('components.max')}
          </button>
        </div>
      )}
      <div className='keypad' role='group' aria-label={t('common.amount')}>
        {keys.map((key) =>
          key ? (
            <button
              key={key}
              type='button'
              onClick={() => pressKey(key)}
              aria-label={key === 'x' ? t('swap.deleteDigit') : `key number ${key}`}
            >
              <p data-testid={`keyboard-${key}`}>{key === 'x' ? <Glyph name='arrowLeft' size={26} /> : key}</p>
            </button>
          ) : (
            <span key='blank' />
          ),
        )}
      </div>
      <div className='amount-screen__actions'>
        <Button label={saveLabel ?? t('common.save')} disabled={disabled} onClick={handleSave} testId='save-amount' />
        {onClear ? <Button label={t('components.clearAmount')} onClick={onClear} clear testId='clear-amount' /> : null}
      </div>
    </div>
  )
}
