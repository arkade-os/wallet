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
import Text from '../../../components/Text'

export default function SendDetails() {
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const isAssetSend = Boolean(sendInfo.assets?.length)
  const { calcSubmarineSwapFee, payInvoice } = useContext(LightningContext)
  const { lnSwapsAllowed, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { navigate } = useContext(NavigationContext)
  const { assetMetadataCache, balance, svcWallet } = useContext(WalletContext)

  const assetId = sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetTicker = assetMeta?.metadata?.ticker ?? ''
  const assetName = assetMeta?.metadata?.name ?? 'Asset'
  const assetAmountValue = sendInfo.assets?.[0]?.amount ?? 0

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const { address, arkAddress, invoice, pendingSwap, satoshis } = sendInfo

  useEffect(() => {
    if (!address && !arkAddress && !invoice) return setError('Missing address')
    if (isAssetSend) {
      if (!assetAmountValue) return setError('Missing asset amount')
      const destination = arkAddress ?? ''
      const feeInSats = defaultFee
      setDetails({
        destination,
        direction: 'Paying inside the Ark',
        fees: feeInSats,
        satoshis: 0,
        total: feeInSats,
      })
      setButtonLabel('Tap to Sign')
      return
    }
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
    if (!details || !svcWallet) return
    if (!isAssetSend && (!details.total || !details.satoshis)) return
    setSending(true)
    if (isAssetSend && arkAddress) {
      // Asset send via wallet.send()
      const recipients = [{ address: arkAddress, amount: details.satoshis, assets: sendInfo.assets }]
      svcWallet
        .send(...recipients)
        .then(handleTxid)
        .catch(handleError)
    } else if (arkAddress) {
      sendOffChain(svcWallet, details.total!, arkAddress).then(handleTxid).catch(handleError)
    } else if (invoice) {
      const response = pendingSwap?.response
      if (!response) return setError('Swap response not available')
      const swapAddress = pendingSwap?.response.address
      if (!swapAddress) return setError('Swap address not available')
      payInvoice(pendingSwap).then(handlePreimage).catch(handleError)
    } else if (address) {
      collaborativeExitWithFees(svcWallet, details.total!, details.satoshis!, address)
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
              {isAssetSend ? (
                <FlexCol gap='0.5rem'>
                  <Text color='dark50' smaller>
                    {assetName} ({assetTicker})
                  </Text>
                  <Text bold>
                    {assetAmountValue} {assetTicker}
                  </Text>
                </FlexCol>
              ) : null}
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
