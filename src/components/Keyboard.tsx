import { IonCol, IonGrid, IonRow } from '@ionic/react'
import Header from './Header'
import Content from './Content'
import { useContext, useEffect, useState } from 'react'
import Text, { TextSecondary } from './Text'
import { FiatContext } from '../providers/fiat'
import { prettyAmount } from '../lib/format'
import { WalletContext } from '../providers/wallet'
import { defaultFee } from '../lib/constants'
import ErrorMessage from './Error'
import Button from './Button'
import ButtonsOnBottom from './ButtonsOnBottom'
import { ConfigContext } from '../providers/config'
import FlexCol from './FlexCol'

interface KeyboardProps {
  back: () => void
  hideBalance?: boolean
  onChange: (arg0: number) => void
  value: number | undefined
}

export default function Keyboard({ back, hideBalance, onChange, value }: KeyboardProps) {
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [amount, setAmount] = useState(0)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    setAmount(value ?? 0)
  }, [value])

  useEffect(() => {
    if (!svcWallet) return
    svcWallet.getBalance().then((bal) => setAvailableBalance(bal.available))
  }, [balance])

  const handleKeyPress = (k: string) => {
    if (k === 'x' && !amount) return
    const text = amount.toString()
    const res = k === 'x' ? text.slice(0, -1) : text + k
    setAmount(Number(res))
  }

  const handleMaxPress = () => {
    if (availableBalance < defaultFee) return setError('Total balance is below fee')
    setAmount(availableBalance - defaultFee)
  }

  const handleSave = () => {
    onChange(amount)
    back()
  }

  const primaryAmount = useFiat ? prettyAmount(amount, config.fiat) : prettyAmount(amount)
  const secondaryAmount = useFiat ? prettyAmount(fromFiat(amount)) : prettyAmount(toFiat(amount), config.fiat)
  const balanceAmount = useFiat ? prettyAmount(availableBalance, config.fiat) : prettyAmount(availableBalance)

  const disabled = !amount || Number.isNaN(amount)

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

  const auxFunc = hideBalance ? undefined : handleMaxPress
  const auxText = hideBalance ? undefined : 'Max'

  return (
    <>
      <Header auxFunc={auxFunc} auxText={auxText} back={back} text='Amount' />
      <Content>
        <FlexCol centered gap='0.5rem'>
          <ErrorMessage error={Boolean(error)} text={error} />
          <Text big centered>
            {primaryAmount}
          </Text>
          <TextSecondary centered>{secondaryAmount}</TextSecondary>
          {hideBalance ? null : <TextSecondary centered>{balanceAmount} available</TextSecondary>}
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
