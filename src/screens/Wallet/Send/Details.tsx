import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { emptySendInfo, FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Details, { DetailsProps } from '../../../components/Details'
import Error from '../../../components/Error'
import { WalletContext } from '../../../providers/wallet'
import Header from '../../../components/Header'
import { defaultFee } from '../../../lib/constants'
import { prettyAmount } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { collaborativeExit, sendOffChain } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import Loading from '../../../components/Loading'
import { consoleError } from '../../../lib/logs'
import WaitingForRound from '../../../components/WaitingForRound'
import { IframeContext } from '../../../providers/iframe'
import Minimal from '../../../components/Minimal'
import Text from '../../../components/Text'
import FlexRow from '../../../components/FlexRow'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'

export default function SendDetails() {
  const { config } = useContext(ConfigContext)
  const { toUSD } = useContext(FiatContext)
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)
  const { wallet } = useContext(WalletContext)

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const { address, arkAddress, satoshis, text } = sendInfo
  const feeInSats = arkAddress ? defaultFee : 0

  useEffect(() => {
    if (!address && !arkAddress) return setError('Missing address')
    if (!satoshis) return setError('Missing amount')
    const total = satoshis + feeInSats
    setDetails({
      address: arkAddress ?? address,
      comment: arkAddress ? 'Paying inside Ark' : 'Paying to mainnet',
      satoshis,
      fees: feeInSats,
      total,
    })
    if (wallet.balance < total) {
      setButtonLabel('Insufficient funds')
      const prettyBalance = prettyAmount(wallet.balance, config.showBalance, config.showFiat, toUSD)
      setError(`Insufficient funds, you just have ${prettyBalance} available`)
    } else {
      setButtonLabel('Tap to Sign')
    }
  }, [sendInfo])

  const handleTxid = (txid: string) => {
    if (!txid) return setError('Error sending transaction')
    setSendInfo({ ...sendInfo, total: (satoshis ?? 0) + feeInSats, txid })
    navigate(Pages.SendSuccess)
  }

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    setError(extractError(err))
    setSending(false)
  }

  const handleCancel = () => {
    setSendInfo(emptySendInfo)
    navigate(Pages.Wallet)
  }

  const handleContinue = () => {
    if (!satoshis) return
    setSending(true)
    if (arkAddress) {
      sendOffChain(satoshis, arkAddress).then(handleTxid).catch(handleError)
    } else if (address) {
      collaborativeExit(satoshis, address).then(handleTxid).catch(handleError)
    }
  }

  if (iframeUrl)
    return (
      <Minimal>
        <Text small>{text ?? `Pay ${satoshis}`}</Text>
        <FlexRow gap='0.1rem' end>
          <Button onClick={handleCancel} label='X' secondary small />
          <Button onClick={handleContinue} label='Ok' disabled={Boolean(error)} small />
        </FlexRow>
      </Minimal>
    )

  return (
    <>
      <Header text='Sign transaction' back={() => navigate(Pages.SendForm)} />
      <Content>
        {sending ? (
          arkAddress ? (
            <Loading text='Paying inside the Ark' />
          ) : (
            <WaitingForRound />
          )
        ) : (
          <Padded>
            <FlexCol>
              <Error error={Boolean(error)} text={error} />
              <Details details={details} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleContinue} label={buttonLabel} disabled={Boolean(error)} />
      </ButtonsOnBottom>
    </>
  )
}
