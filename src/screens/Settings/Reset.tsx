import { useContext, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { WalletContext } from '../../providers/wallet'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import Header from './Header'
import Text, { TextSecondary } from '../../components/Text'
import Checkbox from '../../components/Checkbox'
import { consoleError } from '../../lib/logs'
import { WalletAlternativeIcon } from '../../icons/Wallet'
import CenterScreen from '../../components/CenterScreen'

export default function Reset() {
  const { resetWallet } = useContext(WalletContext)

  const [disabled, setDisabled] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleCheck = () => {
    setDisabled(!disabled)
  }

  const handleReset = () => {
    setLoading(true)
    resetWallet()
      .then(() => {
        location.reload()
      })
      .catch((err) => {
        consoleError(err)
        setLoading(false)
      })
  }

  return (
    <>
      <Header text='Reset wallet' back />
      <Content>
        <Padded>
          <CenterScreen>
            <WalletAlternativeIcon />
            <Text>Did you backup your wallet?</Text>
            <TextSecondary>This operation cannot be undone.</TextSecondary>
          </CenterScreen>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Checkbox onChange={handleCheck} text='I have backed up my wallet' />
        <Button disabled={disabled || loading} label='Reset wallet' onClick={handleReset} red loading={loading} />
      </ButtonsOnBottom>
    </>
  )
}
