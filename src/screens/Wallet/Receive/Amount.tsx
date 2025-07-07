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
import { isMobileBrowser } from '../../../lib/browser'
import BackToWalletButton from '../../../components/BackToWalletButton'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { LimitsContext } from '../../../providers/limits'

export default function ReceiveAmount() {
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { fromFiat, toFiat } = useContext(FiatContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const defaultButtonLabel = 'Skip'

  const [amount, setAmount] = useState<number>()
  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [fauceting, setFauceting] = useState(false)
  const [faucetSuccess, setFaucetSuccess] = useState(false)
  const [faucetAvailable, setFaucetAvailable] = useState(false)
  const [satoshis, setSatoshis] = useState(0)
  const [showKeys, setShowKeys] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    pingFaucet(aspInfo)
      .then(setFaucetAvailable)
      .catch(() => {})
  }, [])

  if (!svcWallet) return <Loading text='Loading...' />

  useEffect(() => {
    getReceivingAddresses(svcWallet)
      .then(({ offchainAddr, boardingAddr }) => {
        if (!offchainAddr) throw 'Unable to get offchain address'
        if (!boardingAddr) throw 'Unable to get boarding address'
        setRecvInfo({ boardingAddr, offchainAddr, satoshis: 0 })
      })
      .catch((err) => {
        const error = extractError(err)
        consoleError(error, 'error getting addresses')
        setError(error)
      })
  }, [])

  useEffect(() => {
    setSatoshis(useFiat ? fromFiat(amount) : amount ?? 0)
  }, [amount])

  useEffect(() => {
    setButtonLabel(
      !satoshis
        ? defaultButtonLabel
        : amountIsBelowMinLimit(satoshis)
        ? 'Amount below min limit'
        : amountIsAboveMaxLimit(satoshis)
        ? 'Amount above max limit'
        : 'Continue',
    )
  }, [satoshis])

  const handleChange = (amount: number) => {
    setAmount(amount)
    setButtonLabel(amount ? 'Continue' : defaultButtonLabel)
  }

  const handleFaucet = async () => {
    try {
      if (!amount) throw 'Invalid amount'
      setFauceting(true)
      const ok = await callFaucet(recvInfo.offchainAddr, satoshis, aspInfo)
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
    setRecvInfo({ ...recvInfo, satoshis })
    navigate(Pages.ReceiveQRCode)
  }

  const showFaucetButton = balance === 0 && faucetAvailable
  const disabled = !satoshis ? false : amountIsBelowMinLimit(satoshis) || amountIsAboveMaxLimit(satoshis)

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
    const displayAmount = useFiat ? prettyAmount(toFiat(amount), config.fiat) : prettyAmount(amount ?? 0)
    return (
      <>
        <Header text='Success' />
        <Content>
          <Success text={`${displayAmount} received from faucet successfully`} />
        </Content>
        <ButtonsOnBottom>
          <BackToWalletButton />
        </ButtonsOnBottom>
      </>
    )
  }

  return (
    <>
      <Header text='Receive' back={() => navigate(Pages.Wallet)} />
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
        <Button label={buttonLabel} onClick={handleProceed} disabled={disabled} />
        {showFaucetButton ? <Button disabled={!amount} label='Faucet' onClick={handleFaucet} secondary /> : null}
      </ButtonsOnBottom>
    </>
  )
}
