import { useContext, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReducedMotion } from '../../../hooks/useReducedMotion'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import ErrorMessage from '../../../components/Error'
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
import { prettyAmount, prettyNumber } from '../../../lib/format'
import Success from '../../../components/Success'
import { consoleError } from '../../../lib/logs'
import { AspContext } from '../../../providers/asp'
import { isMobileBrowser } from '../../../lib/browser'
import { overlaySlideUp, overlayStyle } from '../../../lib/animations'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { LimitsContext } from '../../../providers/limits'
import { LightningContext } from '../../../providers/lightning'
import { InfoLine } from '../../../components/Info'

export default function ReceiveAmount() {
  const prefersReduced = useReducedMotion()
  const { aspInfo } = useContext(AspContext)
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { recvInfo, setRecvInfo } = useContext(FlowContext)
  const { calcReverseSwapFee } = useContext(LightningContext)
  const { amountIsAboveMaxLimit, amountIsBelowMinLimit, validLnSwap } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const defaultButtonLabel = 'Skip'

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [error, setError] = useState('')
  const [fauceting, setFauceting] = useState(false)
  const [faucetSuccess, setFaucetSuccess] = useState(false)
  const [faucetAvailable, setFaucetAvailable] = useState(false)
  const [satoshis, setSatoshis] = useState(0)
  const [showKeys, setShowKeys] = useState(false)
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    setError(aspInfo.unreachable ? 'Ark server unreachable' : '')
  }, [aspInfo.unreachable])

  useEffect(() => {
    pingFaucet(aspInfo)
      .then(setFaucetAvailable)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!svcWallet) return
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
  }, [svcWallet])

  useEffect(() => {
    setButtonLabel(
      !satoshis
        ? defaultButtonLabel
        : satoshis < 1
          ? 'Amount below ₿1'
          : amountIsAboveMaxLimit(satoshis)
            ? 'Amount above max limit'
            : amountIsBelowMinLimit(satoshis)
              ? 'Amount below min limit'
              : 'Continue',
    )
  }, [satoshis])

  if (!svcWallet) return <Loading text='Loading...' />

  const handleChange = (sats: number) => {
    setSatoshis(sats)
    const value = useFiat ? toFiat(sats) : sats
    const maximumFractionDigits = useFiat ? 2 : 0
    setTextValue(prettyNumber(value, maximumFractionDigits, false))
    setButtonLabel(sats ? 'Continue' : defaultButtonLabel)
  }

  const handleFaucet = async () => {
    try {
      if (!satoshis) throw 'Invalid amount'
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
  const showLightningFees = satoshis && validLnSwap(satoshis)
  const reverseSwapFee = calcReverseSwapFee(satoshis)
  const lightningFeeText = `Lightning fees: ${prettyAmount(reverseSwapFee, config)}`

  const disabled = !satoshis
    ? false
    : satoshis < 1 || amountIsAboveMaxLimit(satoshis) || amountIsBelowMinLimit(satoshis)

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
    const displayAmount = useFiat
      ? prettyAmount(toFiat(satoshis), undefined, config.fiat)
      : prettyAmount(satoshis ?? 0, config)
    return (
      <>
        <Header text='Success' />
        <Content>
          <Success headline='Faucet completed!' text={`${displayAmount} received successfully`} />
        </Content>
      </>
    )
  }

  return (
    <>
      <Header text='Receive' back />
      <Content>
        <Padded>
          <FlexCol>
            <ErrorMessage error={Boolean(error)} text={error} />
            <InputAmount
              name='receive-amount'
              focus={!isMobileBrowser}
              label='Amount'
              onSats={handleChange}
              onFocus={handleFocus}
              readOnly={isMobileBrowser}
              value={textValue ? Number(textValue) : undefined}
              sats={satoshis}
            />
            {showLightningFees ? <InfoLine color='orange' text={lightningFeeText} /> : null}
          </FlexCol>
        </Padded>
      </Content>
      <ButtonsOnBottom>
        <Button label={buttonLabel} onClick={handleProceed} disabled={disabled} />
        {showFaucetButton ? <Button disabled={!satoshis} label='Faucet' onClick={handleFaucet} secondary /> : null}
      </ButtonsOnBottom>
      <AnimatePresence>
        {showKeys ? (
          <motion.div
            key='keyboard'
            variants={prefersReduced ? undefined : overlaySlideUp}
            initial={prefersReduced ? false : 'initial'}
            animate={prefersReduced ? undefined : 'animate'}
            exit={prefersReduced ? undefined : 'exit'}
            style={overlayStyle}
          >
            <Keyboard back={() => setShowKeys(false)} hideBalance onSats={handleChange} value={satoshis} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
