import Header from './Header'
import Content from './Content'
import { useContext, useEffect, useState } from 'react'
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
import { prettyAssetAmount, unitsToCents } from '../lib/assets'

export type KeyboardInputMode = 'sats' | 'fiat' | 'asset' | 'btc'

interface KeyboardProps {
  asset?: AssetOption
  back: () => void
  hideBalance?: boolean
  onSave: (value: string, inputMode: KeyboardInputMode) => void
  onClear?: () => void
  initialValue?: bigint | number
}

export default function Keyboard({ asset, back, hideBalance, onClear, onSave, initialValue }: KeyboardProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat, fiatDecimals } = useContext(FiatContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [assetInCents, setAssetInCents] = useState(BigInt(0))
  const [amountInSats, setAmountInSats] = useState(0)
  const [available, setAvailable] = useState(0)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<KeyboardInputMode>('sats')
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    setInputMode(asset?.assetId ? 'asset' : useFiat ? 'fiat' : config.unit === Unit.BTC ? 'btc' : 'sats')
  }, [asset, useFiat, config.unit])

  useEffect(() => {
    if (initialValue && inputMode && toFiat && fiatDecimals) {
      if (inputMode === 'asset') {
        setTextValue(prettyAssetAmount(BigInt(initialValue), asset?.decimals ?? 0, false))
      } else if (inputMode === 'fiat') {
        setTextValue(prettyNumber(toFiat(Number(initialValue)), fiatDecimals(), false))
      } else if (inputMode === 'btc') {
        setTextValue(prettyNumber(fromSatoshis(Number(initialValue)), 8, false))
      } else {
        setTextValue(prettyNumber(Number(initialValue), 0, false))
      }
    }
  }, [initialValue, inputMode, asset, toFiat, fiatDecimals])

  useEffect(() => {
    if (!svcWallet) return
    svcWallet.getBalance().then((bal) => setAvailable(bal.available))
  }, [balance])

  useEffect(() => {
    const strValue = textValue.replaceAll(',', '')
    if (inputMode === 'asset' && asset) {
      setAssetInCents(unitsToCents(strValue, asset.decimals))
    } else {
      setAmountInSats(
        inputMode === 'fiat'
          ? fromFiat(Number(strValue))
          : inputMode === 'btc'
            ? toSatoshis(Number(strValue))
            : Number(strValue),
      )
    }
  }, [textValue])

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

  const handleKeyPress = (k: string) => {
    // Handle decimal point
    if (k === '.') {
      const maxDecimals = getMaxDecimals()
      if (maxDecimals === 0) return // No decimals for sats
      if (textValue.includes('.')) return // Already has decimal point
      return setTextValue((prev) => (prev === '' ? '0.' : prev + '.'))
    }

    // Handle backspace
    if (k === 'x') {
      if (textValue.length === 0) return // nothing to delete
      return setTextValue(textValue.slice(0, -1))
    }

    // Handle number input with decimal validation
    const newText = textValue + k
    const parts = newText.split('.')
    if (parts.length > 1) {
      const decimalPlaces = parts[1].length
      const maxDecimals = getMaxDecimals()
      if (decimalPlaces > maxDecimals) return // Exceeded max decimals
    }

    setTextValue(newText)
  }

  const handleMaxPress = () => {
    if (asset) {
      const { balance, decimals } = asset
      setTextValue(prettyAssetAmount(balance, decimals, false))
      return
    } else {
      const maxSats = available - defaultFee
      const maxTextValue =
        inputMode === 'fiat' ? toFiat(maxSats) : inputMode === 'sats' ? maxSats : fromSatoshis(maxSats)
      setTextValue(prettyNumber(maxTextValue, getMaxDecimals(), false))
    }
  }

  const handleToggleCurrency = () => {
    if (inputMode === 'asset') return // No toggle for assets
    if (inputMode === 'sats' || inputMode === 'btc') {
      // Convert from sats to fiat and round to 2 decimal places
      setTextValue(amountInSats ? prettyNumber(toFiat(amountInSats), fiatDecimals(), false) : '')
      setInputMode('fiat')
    } else {
      setTextValue(amountInSats ? prettyNumber(amountInSats, 0, false) : '')
      setInputMode(config.unit === Unit.BTC ? 'btc' : 'sats')
    }
  }

  const handleSave = () => {
    if (!textValue || Number.isNaN(Number(textValue))) {
      setError('Please enter a valid amount')
      return
    }
    onSave(textValue, inputMode)
  }

  const prettyBitcoinAmount = (sats: number) => {
    return config.unit === Unit.BTC
      ? prettyAmount(fromSatoshis(sats), config.unit, 8)
      : prettyAmount(sats, config.unit, 0)
  }

  // Display amounts based on input mode
  const amount = {
    primary:
      inputMode === 'asset'
        ? `${textValue || '0'} ${asset?.ticker}`
        : inputMode === 'fiat'
          ? prettyFiatAmount(amountInSats ? toFiat(amountInSats) : 0, config.fiat, {
              bitcoinUnit: config.unit,
            })
          : `${textValue || '0'} ${config.unit}`,
    secondary: !useFiat
      ? ''
      : inputMode === 'fiat'
        ? prettyBitcoinAmount(amountInSats)
        : prettyFiatAmount(amountInSats ? toFiat(amountInSats) : 0, config.fiat, {
            bitcoinUnit: config.unit,
          }),
    balance:
      inputMode === 'asset'
        ? `${prettyAssetAmount(asset?.balance ?? BigInt(0), asset?.decimals ?? 0)} ${asset?.ticker}`
        : inputMode === 'fiat'
          ? prettyFiatAmount(toFiat(available), config.fiat, { bitcoinUnit: config.unit })
          : prettyBitcoinAmount(available),
  }

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
    ['.', '0', 'x'],
  ]

  const showSecondaryValue = !asset?.assetId && config.fiat !== Currencies.BTC

  return (
    <>
      <Header
        auxAriaLabel={showSecondaryValue ? 'Toggle currency' : undefined}
        auxFunc={showSecondaryValue ? handleToggleCurrency : undefined}
        auxIcon={showSecondaryValue ? <SwapIcon /> : undefined}
        back={back}
        text='Amount'
      />
      <Content>
        <FlexCol centered gap='0.5rem'>
          <ErrorMessage error={Boolean(error)} text={error} />
          <Text big centered heading>
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
            {row.map((key) => (
              <div style={keyStyle} key={key} onClick={() => handleKeyPress(key)}>
                <p data-testid={`keyboard-${key}`}>{key === 'x' ? <>&larr;</> : key}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ButtonsOnBottom>
        <Button label='Save' disabled={disabled} onClick={handleSave} testId='save-amount' />
        {onClear ? <Button label='Clear amount' onClick={onClear} secondary testId='clear-amount' /> : null}
      </ButtonsOnBottom>
    </>
  )
}
