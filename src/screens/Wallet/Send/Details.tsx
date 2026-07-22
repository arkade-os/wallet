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
import { collaborativeExitWithFees, sendAssets, sendOffChain } from '../../../lib/asp'
import { extractError } from '../../../lib/error'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { LimitsContext } from '../../../providers/limits'
import { SwapsContext } from '../../../providers/swaps'
import { isPendingChainSwap, isPendingSubmarineSwap } from '@arkade-os/boltz-swap'
import { FeesContext } from '../../../providers/fees'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { buildTransactionAmountDisplay } from '../../../lib/transactionAmountDisplay'
import TransactionAmountSummary from '../../../components/TransactionAmountSummary'

export default function SendDetails() {
  const { aspInfo } = useContext(AspContext)
  const { config } = useContext(ConfigContext)
  const { fromFiatAmount, toFiatAmount } = useContext(FiatContext)
  const { navigate } = useContext(NavigationContext)
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const isAssetSend = Boolean(sendInfo.account || sendInfo.assets?.length)
  const { lnSwapsAllowed, utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { payInvoice, payBtc } = useContext(SwapsContext)
  const { assetMetadataCache, balance, isVerifiedAsset, svcWallet } = useContext(WalletContext)

  const assetId = sendInfo.account?.assetId ?? sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetDecimals = sendInfo.account?.decimals ?? assetMeta?.metadata?.decimals ?? 8
  const assetAmountValue = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendDone, setSendDone] = useState(false)

  const { address, arkAddress, invoice, pendingSwap, satoshis } = sendInfo
  const amountDisplay = pendingSwap
    ? undefined
    : buildTransactionAmountDisplay({
        assets: sendInfo.account
          ? [{ assetId: sendInfo.account.assetId, amount: sendInfo.account.amount }]
          : sendInfo.assets,
        bitcoinUnit: config.unit,
        currency: config.currency,
        fromFiatAmount,
        isVerifiedAsset,
        metadataForAsset: (id) => ({
          ...assetMetadataCache.get(id)?.metadata,
          decimals: id === assetId ? assetDecimals : assetMetadataCache.get(id)?.metadata?.decimals,
        }),
        network: aspInfo.network,
        satoshis: details?.satoshis ?? satoshis ?? 0,
        toFiatAmount,
      })

  useEffect(() => {
    if (!address && !arkAddress && !invoice) return setError('Missing address')
    if (isAssetSend) {
      if (!assetAmountValue) return setError('Missing asset amount')
      const destination = arkAddress ?? ''
      const feeInSats = defaultFee
      setDetails({
        assetId,
        destination,
        direction: 'Sending assets',
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
    const fees = total - amount > 0 ? total - amount : 0
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
      if (!sendInfo.assets || sendInfo.assets.length === 0) return handleError('Missing assets list')
      sendAssets(svcWallet, arkAddress, sendInfo.assets)
        .then((txId: string) => handleTxid(txId))
        .catch(handleError)
    } else if (arkAddress) {
      if (!details.total) return handleError('Missing total amount')
      sendOffChain(svcWallet, details.total, arkAddress)
        .then((txId: string) => handleTxid(txId))
        .catch(handleError)
    } else if (invoice && pendingSwap && isPendingSubmarineSwap(pendingSwap)) {
      const swapAddress = pendingSwap.response.address
      if (!swapAddress) return handleError('Swap address not available')
      // Resolves optimistically once the swap is funded; settlement is
      // monitored in the background and surfaced on the success screen.
      payInvoice(pendingSwap)
        .then(({ txid }) => handleTxid(txid))
        .catch(handleError)
    } else if (address) {
      if (pendingSwap && isPendingChainSwap(pendingSwap)) {
        payBtc(pendingSwap)
          .then(({ txid }) => handleTxid(txid))
          .catch(handleError)
      } else {
        if (!details.total) return handleError('Missing total amount')
        if (!details.satoshis) return handleError('Missing satoshis amount')
        collaborativeExitWithFees(svcWallet, details.total, details.satoshis, address)
          .then((txId: string) => handleTxid(txId))
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
              text='Paying to mainnet'
              done={sendDone}
              exitMode='fly-up'
              onExitComplete={handleExitComplete}
            />
          )
        ) : (
          <Padded>
            <FlexCol>
              <ErrorMessage error={Boolean(error)} text={error} />
              {details && amountDisplay ? (
                <TransactionAmountSummary amount={amountDisplay} label='Amount sent' />
              ) : null}
              <Details
                details={
                  details ? { ...details, amountDisplay, total: isAssetSend ? undefined : details.total } : undefined
                }
              />
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
