import { useContext, useState } from 'react'
import Header from '../../../components/Header'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Content from '../../../components/Content'
import Padded from '../../../components/Padded'
import FlexCol from '../../../components/FlexCol'
import InputAddress from '../../../components/InputAddress'
import Scanner from '../../../components/Scanner'
import Error from '../../../components/Error'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Button from '../../../components/Button'
import { WalletContext } from '../../../providers/wallet'
import { getPubKey, submarineSwap } from '../../../lib/boltz'
import { FlowContext } from '../../../providers/flow'

export default function SendLightningForm() {
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet } = useContext(WalletContext)

  const [error, setError] = useState('')
  const [recipient, setRecipient] = useState('')
  const [scan, setScan] = useState(false)

  const handleContinue = async () => {
    if (!recipient) {
      setError('Please enter a Lightning invoice')
      return
    }

    try {
      const pubkey = await getPubKey()
      const { txid, amount } = await submarineSwap(recipient, pubkey, wallet)
      // TODO: use websocket or check /swap/<id> to show pending/success states
      setSendInfo({ ...sendInfo, total: amount, txid })
      navigate(Pages.SendSuccess)
    } catch (err) {
      console.error('Error creating Lightning payment:', err)
      setError('Failed to connect to payment server')
    }
  }

  if (scan) return <Scanner close={() => setScan(false)} label='Invoice' setData={setRecipient} setError={setError} />

  return (
    <>
      <Header text='Send' back={() => navigate(Pages.Wallet)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <Error error={Boolean(error)} text={error} />
            <InputAddress
              focus
              label='Invoice'
              onChange={setRecipient}
              onEnter={() => {}}
              openScan={() => {
                setScan(true)
              }}
              value={recipient}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleContinue} label='Send' disabled={false} />
      </ButtonsOnBottom>
    </>
  )
}
