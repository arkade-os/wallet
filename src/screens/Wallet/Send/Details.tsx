import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
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
import { collaborativeExitWithFees, sendOffChain } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import Loading from '../../../components/Loading'
import { consoleError } from '../../../lib/logs'
import WaitingForRound from '../../../components/WaitingForRound'
import { LimitsContext } from '../../../providers/limits'
import { LightningContext } from '../../../providers/lightning'
import { FeesContext } from '../../../providers/fees'

export default function SendDetails() {
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { calcSubmarineSwapFee, payInvoice } = useContext(LightningContext)
  const { lnSwapsAllowed, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { balance, svcWallet } = useContext(WalletContext)

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const { address, arkAddress, invoice, pendingSwap, satoshis } = sendInfo

  useEffect(() => {
    if (!address && !arkAddress && !invoice) return setError('Missing address')
    if (!satoshis) return setError('Missing amount')
    const destination =
      arkAddress && vtxoTxsAllowed()
        ? arkAddress
        : invoice && pendingSwap && lnSwapsAllowed()
          ? invoice
          : address && utxoTxsAllowed()
            ? address
            : ''
    const direction =
      destination === arkAddress
        ? 'Paying inside the Ark'
        : destination === invoice
          ? 'Swapping to Lightning'
          : destination === address
            ? 'Paying to mainnet'
            : ''
    const feeInSats =
      destination === invoice
        ? calcSubmarineSwapFee(satoshis)
        : destination === address
          ? calcOnchainOutputFee()
          : defaultFee
    const swapId = pendingSwap?.id
    const total = satoshis + feeInSats
    setDetails({
      destination,
      direction,
      fees: feeInSats,
      satoshis,
      swapId,
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

  const handleContinue = async () => {
    if (!details?.total || !details.satoshis || !svcWallet?.writer) return
    setSending(true)
    if (arkAddress) {
      sendOffChain(svcWallet.writer, details.total, arkAddress).then(handleTxid).catch(handleError)
    } else if (invoice) {
      const response = pendingSwap?.response
      if (!response) return setError('Swap response not available')
      const swapAddress = pendingSwap?.response.address
      if (!swapAddress) return setError('Swap address not available')
      payInvoice(pendingSwap).then(handlePreimage).catch(handleError)
    } else if (address) {
      collaborativeExitWithFees(svcWallet.writer, details.total, details.satoshis, address)
        .then(handleTxid)
        .catch(handleError)
    }
  }

  return (
    <>
      <Header text='Sign transaction' back={() => navigate(Pages.SendForm)} />
      <Content>
        {sending ? (
          details?.destination === invoice ? (
            <Loading text='Paying to Lightning' />
          ) : details?.destination === arkAddress ? (
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
