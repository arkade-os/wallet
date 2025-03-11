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
import { prettyAmount } from '../../../lib/format'
import Success from '../../../components/Success'
import { consoleError } from '../../../lib/logs'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function ReceiveAmount() {
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { fromUSD, toUSD } = useContext(FiatContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet } = useContext(WalletContext)

  const defaultButtonLabel = 'Continue without amount'
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints

  const [amount, setAmount] = useState(0)
  const [amountInSats, setAmountInSats] = useState(0)
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

  useEffect(() => {
    setButtonLabel(amount ? 'Continue' : defaultButtonLabel)
    setAmountInSats(config.showFiat ? fromUSD(amount) : amount)
  }, [amount])

  const handleFaucet = async () => {
    try {
      if (!amount) throw 'Invalid amount'
      setFauceting(true)
      const ok = await callFaucet(recvInfo.offchainAddr, amountInSats, aspInfo.url)
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
    if (isMobile) setShowKeys(true)
  }

  const handleProceed = () => {
    setRecvInfo({ ...recvInfo, satoshis: amountInSats })
    navigate(Pages.ReceiveQRCode)
  }

  const showFaucetButton = wallet.balance === 0 && faucetAvailable

  if (showKeys) {
    return <Keyboard back={() => setShowKeys(false)} hideBalance onChange={setAmount} value={amount} />
  }

  if (fauceting) {
    return (
      <>
        <Header text='Fauceting' />
        <Content>
          <Loading text='Getting funds from the faucet. This may take a few moments.' />
        </Content>
      </>
    )
  }

  if (faucetSuccess) {
    return (
      <>
        <Header text='Success' />
        <Content>
          <Success text={`${prettyAmount(amountInSats, true, config.showFiat, toUSD)} received successfully`} />
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
              focus={!isMobile}
              label='Amount'
              onChange={setAmount}
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
