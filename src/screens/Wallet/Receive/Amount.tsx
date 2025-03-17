import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import Error from '../../../components/Error'
import { getReceivingAddresses } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import Header from '../../../components/Header'
import InputAmount from '../../../components/InputAmount'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Keyboard from '../../../components/Keyboard'
import { WalletContext } from '../../../providers/wallet'
import { callFaucet, pingFaucet } from '../../../lib/faucet'
import Loading from '../../../components/Loading'
import { prettyNumber } from '../../../lib/format'
import Success from '../../../components/Success'
import { consoleError } from '../../../lib/logs'
import { AspContext } from '../../../providers/asp'
import { isMobileBrowser } from '../../../lib/browser'

export default function ReceiveAmount() {
  const { aspInfo } = useContext(AspContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet } = useContext(WalletContext)

  const defaultButtonLabel = 'Continue without amount'

  const [amount, setAmount] = useState(0)
  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [fauceting, setFauceting] = useState(false)
  const [faucetSuccess, setFaucetSuccess] = useState(false)
  const [faucetAvailable, setFaucetAvailable] = useState(false)
  const [showKeys, setShowKeys] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    pingFaucet(aspInfo.url)
      .then(setFaucetAvailable)
      .catch(() => {})
  }, [])

  useEffect(() => {
    getReceivingAddresses()
      .then(({ offchainAddr, boardingAddr }) => {
        if (!offchainAddr) throw 'Unable to get offchain address'
        if (!boardingAddr) throw 'Unable to get boarding address'
        setRecvInfo({ boardingAddr, offchainAddr, satoshis: 0 })
      })
      .catch((err) => {
        consoleError(err, 'error getting addresses')
        setError(extractError(err))
      })
  }, [])

  const handleChange = (sats: number) => {
    setAmount(sats)
    setButtonLabel(sats ? 'Continue' : defaultButtonLabel)
  }

  const handleFaucet = async () => {
    try {
      if (!amount) throw 'Invalid amount'
      setFauceting(true)
      const ok = await callFaucet(recvInfo.offchainAddr, amount, aspInfo.url)
      if (!ok) throw 'Faucet failed'
      setFauceting(false)
      setFaucetSuccess(true)
    } catch (err) {
      consoleError(err, 'error fauceting')
      setError(extractError(err))
      setFauceting(false)
    }
  }

  const handleFocus = () => {
    if (isMobileBrowser) setShowKeys(true)
  }

  const handleProceed = async () => {
    try {
      setRecvInfo({ ...recvInfo, satoshis: amount })
      navigate(Pages.ReceiveQRCode)
    } catch (err) {
      consoleError(err, 'error getting addresses')
      setError(extractError(err))
    }
  }

  const showFaucetButton = wallet.balance === 0 && faucetAvailable

  if (showKeys) {
    return <Keyboard back={() => setShowKeys(false)} hideBalance onChange={handleChange} value={amount} />
  }

  if (fauceting) {
    return (
      <>
        <Header text='Fauceting' />
        <Content>
          <Loading text='Getting sats from a faucet. This may take a few moments.' />
        </Content>
      </>
    )
  }

  if (faucetSuccess) {
    return (
      <>
        <Header text='Success' />
        <Content>
          <Success text={`${prettyNumber(amount)} sats received from faucet successfully`} />
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text='Receive' />
      <Content>
        <Padded>
          <FlexCol>
            <Error error={Boolean(error)} text={error} />
            <InputAmount
              focus={!isMobileBrowser}
              label='Amount'
              onChange={handleChange}
              onEnter={handleProceed}
              onFocus={handleFocus}
              value={amount}
            />
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={buttonLabel} onClick={handleProceed} />
        {showFaucetButton ? <Button disabled={!amount} label='Faucet' onClick={handleFaucet} secondary /> : null}
      </ButtonsOnBottom>
    </>
  )
}
