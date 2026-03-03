import { IonCol, IonGrid, IonRow } from '@ionic/react'
import Header from './Header'
import Content from './Content'
import { useContext, useEffect, useState } from 'react'
import Text, { TextSecondary } from './Text'
import { FiatContext } from '../providers/fiat'
import { prettyAmount, prettyNumber } from '../lib/format'
import { WalletContext } from '../providers/wallet'
import { defaultFee } from '../lib/constants'
import ErrorMessage from './Error'
import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import { ConfigContext } from '../providers/config'
import FlexCol from './FlexCol'
import SwapIcon from '../icons/Swap'

interface KeyboardProps {
  back: () => void
  hideBalance?: boolean
  onSats: (sats: number) => void
  value: number | undefined
}

export default function Keyboard({ back, hideBalance, onSats, value }: KeyboardProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [amountInSats, setAmountInSats] = useState(0)
  const [available, setAvailable] = useState(0)
  const [error, setError] = useState('')
  const [inputMode, setInputMode] = useState<'sats' | 'fiat'>(useFiat ? 'fiat' : 'sats')
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    if (!value) return setTextValue('')
    const amount = inputMode === 'fiat' ? toFiat(value) : value
    setTextValue(prettyNumber(amount, getMaxDecimals()))
  }, [value])

  useEffect(() => {
    if (!svcWallet) return
    svcWallet.getBalance().then((bal) => setAvailable(bal.available))
  }, [balance])

  useEffect(() => {
    const value = Number(textValue.replaceAll(',', ''))
    if (Number.isNaN(value)) return
    setAmountInSats(inputMode === 'fiat' ? fromFiat(value) : value)
  }, [textValue])

  const getMaxDecimals = () => {
    return inputMode === 'fiat' ? 2 : 0
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
    if (available < defaultFee) return setError('Total balance is below fee')
    const maxSats = available - defaultFee
    const maxTextValue = inputMode === 'fiat' ? toFiat(maxSats) : maxSats
    setTextValue(prettyNumber(maxTextValue, getMaxDecimals(), false))
  }

  const handleToggleCurrency = () => {
    if (inputMode === 'sats') {
      // Convert from sats to fiat and round to 2 decimal places
      setTextValue(amountInSats ? prettyNumber(toFiat(amountInSats), 2, false) : '')
      setInputMode('fiat')
    } else {
      setTextValue(amountInSats ? prettyNumber(amountInSats, 0, false) : '')
      setInputMode('sats')
    }
  }

  const handleSave = () => {
    onSats(amountInSats)
    back()
  }

  // Display amounts based on input mode
  const amount = {
    primary: `${textValue || '0'} ${inputMode === 'fiat' ? config.fiat : 'SATS'}`,
    secondary: inputMode === 'fiat' ? prettyAmount(amountInSats) : prettyAmount(toFiat(amountInSats), config.fiat),
    balance: inputMode === 'fiat' ? prettyAmount(toFiat(available), config.fiat) : prettyAmount(available),
  }

  const disabled = !amountInSats || Number.isNaN(amountInSats)

  const gridStyle = {
    borderTop: '1px solid var(--dark50)',
    marginTop: '0.5rem',
    textAlign: 'center',
    width: '100%',
  }

  const rowStyle = {
    fontSize: '1.5rem',
    padding: '1rem',
  }

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'x'],
  ]

  return (
    <>
      <Header
        auxAriaLabel='Toggle currency'
        auxFunc={handleToggleCurrency}
        auxIcon={<SwapIcon />}
        back={back}
        text='Amount'
      />
      <Content>
        <FlexCol centered gap='0.5rem'>
          <ErrorMessage error={Boolean(error)} text={error} />
          <Text big centered heading>
            {amount.primary}
          </Text>
          <TextSecondary centered>{amount.secondary}</TextSecondary>
          {hideBalance ? null : (
            <div onClick={handleMaxPress}>
              <TextSecondary centered>{amount.balance}</TextSecondary>
            </div>
          )}
        </FlexCol>
      </Content>
      <IonGrid style={gridStyle}>
        {keys.map((row) => (
          <IonRow style={rowStyle} key={row[0]}>
            {row.map((key) => (
              <IonCol size='4' key={key} onClick={() => handleKeyPress(key)}>
                <p data-testid={`keyboard-${key}`}>{key === 'x' ? <>&larr;</> : key}</p>
              </IonCol>
            ))}
          </IonRow>
        ))}
      </IonGrid>
      <ButtonsOnBottom>
        <Button label='Save' disabled={disabled} onClick={handleSave} />
      </ButtonsOnBottom>
    </>
  )
}
