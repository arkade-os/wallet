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
import { formatAssetAmount, prettyNumber } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { collaborativeExitWithFees, sendOffChain } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
import Text from '../../../components/Text'
import { isPendingChainSwap, isPendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { FeesContext } from '../../../providers/fees'

export default function SendDetails() {
  const { navigate } = useContext(NavigationContext)
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const isAssetSend = Boolean(sendInfo.assets?.length)
  const { lnSwapsAllowed, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { payInvoice, payBtc } = useContext(SwapsContext)
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
  const [sendDone, setSendDone] = useState(false)

  const { address, arkAddress, invoice, pendingSwap, satoshis } = sendInfo

  useEffect(() => {
    if (!address && !arkAddress && !invoice) return setError('Missing address')
    if (isAssetSend) {
      if (!assetAmountValue) return setError('Missing asset amount')
      const destination = arkAddress ?? ''
      const feeInSats = defaultFee
      setDetails({
        destination,
        direction: 'Paying inside Arkade',
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
        ? 'Paying inside Arkade'
        : destination === invoice
          ? 'Swapping to Lightning'
          : pendingSwap?.type === 'chain'
            ? 'Swapping to mainnet'
            : destination === address
              ? 'Paying to mainnet'
              : ''
    const total = pendingSwap
      ? pendingSwap.type === 'chain'
        ? pendingSwap.response.lockupDetails.amount
        : pendingSwap.type === 'submarine'
          ? pendingSwap.response.expectedAmount
          : satoshis
      : satoshis
    const amount = direction === 'Paying to mainnet' ? satoshis - calcOnchainOutputFee() : satoshis
    const fees = Math.max(0, total - amount)
    const swapId = pendingSwap?.id
    setDetails({
      destination,
      direction,
      fees,
      satoshis: amount,
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
    if (!txid) return handleError('Error sending transaction')
    setSendInfo({ ...sendInfo, total: details?.total, txid })
    setSendDone(true)
  }

  const handleExitComplete = () => {
    if (error) return setSending(false)
    else navigate(Pages.SendSuccess)
  }

  const handleError = (err: any) => {
    consoleError(err, 'error sending payment')
    setError(extractError(err))
    setSendDone(true)
  }

  const handleContinue = async () => {
    if (!details || !svcWallet) return
    if (!isAssetSend && (!details.total || !details.satoshis)) return
    if (isAssetSend && !arkAddress) {
      setError('Assets can only be sent to Arkade addresses')
      return
    }
    setSending(true)
    if (isAssetSend && arkAddress) {
      // Asset send via wallet.send()
      const recipients = [{ address: arkAddress, amount: details.satoshis, assets: sendInfo.assets }]
      svcWallet
        .send(...recipients)
        .then(handleTxid)
        .catch(handleError)
    } else if (arkAddress) {
      if (!details.total) return handleError('Missing total amount')
      sendOffChain(svcWallet, details.total, arkAddress).then(handleTxid).catch(handleError)
    } else if (invoice && pendingSwap && isPendingSubmarineSwap(pendingSwap)) {
      const swapAddress = pendingSwap.response.address
      if (!swapAddress) return handleError('Swap address not available')
      payInvoice(pendingSwap).then(handlePreimage).catch(handleError)
    } else if (address) {
      if (pendingSwap && isPendingChainSwap(pendingSwap)) {
        payBtc(pendingSwap)
          .then(({ txid }) => handleTxid(txid))
          .catch(handleError)
      } else {
        if (!details.total) return handleError('Missing input amount')
        if (!details.satoshis) return handleError('Missing output amount')
        collaborativeExitWithFees(svcWallet, details.total, details.satoshis, address)
          .then(handleTxid)
          .catch(handleError)
      }
    }
  }

  return (
    <>
      <Header text='Sign transaction' back />
      <Content>
        {sending ? (
          details?.destination === invoice ? (
            <LoadingLogo
              text='Paying to Lightning'
              done={sendDone}
              exitMode='fly-up'
              onExitComplete={handleExitComplete}
            />
          ) : details?.destination === arkAddress ? (
            <LoadingLogo
              text='Paying inside Arkade'
              done={sendDone}
              exitMode='fly-up'
              onExitComplete={handleExitComplete}
            />
          ) : (
            <LoadingLogo
              text='Paying to Bitcoin'
              done={sendDone}
              exitMode='fly-up'
              onExitComplete={handleExitComplete}
            />
          )
        ) : (
          <Padded>
            <FlexCol>
              <ErrorMessage error={Boolean(error)} text={error} />
              {isAssetSend ? (
                <FlexCol gap='0.5rem'>
                  <Text color='neutral-500' smaller testId='send-details-asset-name'>
                    {assetName} ({assetTicker})
                  </Text>
                  <Text bold testId='send-details-asset-amount'>
                    {formatAssetAmount(assetAmountValue, assetMeta?.metadata?.decimals ?? 8)} {assetTicker}
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
