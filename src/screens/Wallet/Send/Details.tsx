import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { emptySendInfo, FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Details, { DetailsProps } from '../../../components/Details'
import ErrorMessage from '../../../components/Error'
import { WalletContext } from '../../../providers/wallet'
import Header from '../../../components/Header'
import { defaultFee } from '../../../lib/constants'
import { prettyNumber } from '../../../lib/format'
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
import { LimitsContext } from '../../../providers/limits'
import { LightningContext } from '../../../providers/lightning'

export default function SendDetails() {
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { calcSubmarineSwapFee, swapProvider } = useContext(LightningContext)
  const { lnSwapsAllowed, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const { address, arkAddress, invoice, pendingSwap, satoshis, text } = sendInfo

  useEffect(() => {
    if (!address && !arkAddress && !invoice) return setError('Missing address')
    if (!satoshis) return setError('Missing amount')
    const destination =
      arkAddress && vtxoTxsAllowed()
        ? arkAddress
        : address && utxoTxsAllowed()
          ? address
          : invoice && lnSwapsAllowed()
            ? invoice
            : ''
    const direction =
      arkAddress && vtxoTxsAllowed()
        ? 'Paying inside the Ark'
        : address && utxoTxsAllowed()
          ? 'Paying to mainnet'
          : invoice && lnSwapsAllowed()
            ? 'Swapping to Lightning'
            : ''
    const feeInSats = destination === invoice ? calcSubmarineSwapFee(satoshis) : defaultFee
    const total = satoshis + feeInSats
    setDetails({
      destination,
      direction,
      fees: feeInSats,
      satoshis,
      total,
    })
    if (balance < total) {
      setButtonLabel('Insufficient funds')
      setError(`Insufficient funds, you just have ${prettyNumber(balance)} sats`)
    } else {
      setButtonLabel('Tap to Sign')
    }
  }, [sendInfo])

  const handlePreimage = ({ txid }: { preimage: string; txid: string }) => {
    handleTxid(txid)
  }

  const handleTxid = (txid: string) => {
    if (!txid) return setError('Error sending transaction')
    setSendInfo({ ...sendInfo, total: details?.total, txid })
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

  const handleContinue = async () => {
    if (!satoshis || !svcWallet) return
    setSending(true)
    if (arkAddress) {
      sendOffChain(svcWallet, satoshis, arkAddress).then(handleTxid).catch(handleError)
    } else if (invoice) {
      const response = pendingSwap?.response
      if (!response) return setError('Swap response not available')
      const swapAddress = pendingSwap?.response.address
      if (!swapAddress) return setError('Swap address not available')
      const promise = swapProvider?.payInvoice(pendingSwap)
      if (!promise) {
        setError('Lightning swaps not enabled')
        setSending(false)
        return
      }
      promise.then(handlePreimage).catch(handleError)
    } else if (address) {
      collaborativeExit(svcWallet, satoshis, address).then(handleTxid).catch(handleError)
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
          invoice ? (
            <Loading text='Paying to Lightning' />
          ) : arkAddress ? (
            <Loading text='Paying inside the Ark' />
          ) : (
            <WaitingForRound />
          )
        ) : (
          <Padded>
            <FlexCol>
              <ErrorMessage error={Boolean(error)} text={error} />
              <Details details={details} />
            </FlexCol>
          </Padded>
        )}
      </Content>
      <ButtonsOnBottom>
        {sending ? null : <Button onClick={handleContinue} label={buttonLabel} disabled={Boolean(error)} />}
      </ButtonsOnBottom>
    </>
  )
}
