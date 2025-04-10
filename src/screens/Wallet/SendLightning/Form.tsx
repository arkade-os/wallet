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
import { sendOffChain } from '../../../lib/asp'

const boltzApi = 'http://localhost:9006'

export default function SendLightningForm() {
  const { navigate } = useContext(NavigationContext)

  const [recipient, setRecipient] = useState('')
  const [scan, setScan] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = async () => {
    if (!recipient) {
      setError('Please enter a Lightning invoice')
      return
    }

    try {
      const response = await fetch(`${boltzApi}/v2/swap/submarine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ARK',
          to: 'BTC',
          invoice: recipient,
          // TODO: get this out of "window.receive"?
          refundPublicKey: '03c27f5aa8943bad4e18285689904e9b30e58bc51923e920f394b5e55d7585a5e9',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to process Lightning payment')
        return
      }

      const res = (await response.json()) as {
        address: string
        expectedAmount: number
      }
      console.log('Swap created:', res)

      const sendRes = await sendOffChain(res.expectedAmount, res.address)
      console.log('Send response:', sendRes)

      // TODO: use websocket or check /swap/<id> to show pending/success states
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
              openScan={() => {}}
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
