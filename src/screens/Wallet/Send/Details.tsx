import { useContext, useEffect, useState } from 'react'
import Button from '../../../components/Button'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { FlowContext } from '../../../providers/flow'
import Padded from '../../../components/Padded'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Details, { DetailsProps } from '../../../components/Details'
import ErrorMessage from '../../../components/Error'
import { WalletContext } from '../../../providers/wallet'
import { LnSwapsContext } from '../../../providers/lnSwaps'
import Header from '../../../components/Header'
import { defaultFee } from '../../../lib/constants'
import { prettyNumber } from '../../../lib/format'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { collaborativeExitWithFees, sendAssets, sendOffChain } from '../../../lib/asp'
import { type LnSendRequest } from '../../../lib/lnSwap'
import { extractError } from '../../../lib/error'
import LoadingLogo from '../../../components/LoadingLogo'
import { consoleError } from '../../../lib/logs'
import { LimitsContext } from '../../../providers/limits'
import { FeesContext } from '../../../providers/fees'
import { buildTransactionAmountDisplay } from '../../../lib/transactionAmountDisplay'
import { useAmountDisplayContext } from '../../../hooks/useTransactionAmountDisplay'
import TransactionAmountSummary from '../../../components/TransactionAmountSummary'
import { saveTransactionActivityMetadata } from '../../../lib/storage'

export default function SendDetails() {
  const displayContext = useAmountDisplayContext()
  const { navigate } = useContext(NavigationContext)
  const { sendInfo, setSendInfo } = useContext(FlowContext)
  const { calcOnchainOutputFee } = useContext(FeesContext)
  const isAssetSend = Boolean(sendInfo.account || sendInfo.assets?.length)
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { assetMetadataCache, balance, reloadWallet, svcWallet } = useContext(WalletContext)
  const { trackLnSend } = useContext(LnSwapsContext)

  const assetId = sendInfo.account?.assetId ?? sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetDecimals = sendInfo.account?.decimals ?? assetMeta?.metadata?.decimals ?? 8
  const assetAmountValue = sendInfo.account?.amount ?? sendInfo.assets?.[0]?.amount ?? BigInt(0)

  const [buttonLabel, setButtonLabel] = useState('')
  const [details, setDetails] = useState<DetailsProps>()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sendDone, setSendDone] = useState(false)

  const { address, arkAddress, invoice, pendingLnSend, satoshis } = sendInfo
  const amountDisplay = buildTransactionAmountDisplay({
    ...displayContext,
    assets: sendInfo.account
      ? [{ assetId: sendInfo.account.assetId, amount: sendInfo.account.amount }]
      : sendInfo.assets,
    metadataForAsset: (id) => {
      const metadata = assetMetadataCache.get(id)?.metadata
      return id === assetId ? { ...metadata, decimals: assetDecimals } : metadata
    },
    satoshis: details?.satoshis ?? satoshis ?? 0,
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
        : invoice && pendingLnSend && vtxoTxsAllowed()
          ? invoice
          : address && utxoTxsAllowed()
            ? address
            : ''
    const direction =
      destination === arkAddress
        ? 'Paying inside Arkade'
        : destination === invoice
          ? 'Paying to Lightning'
          : destination === address
            ? 'Paying to mainnet'
            : ''
    // The RFQ lockup carries exactly the invoice amount (exact-out, fee_bps
    // from the card; 0 today), so total == satoshis on the Lightning path.
    const total = pendingLnSend ? pendingLnSend.fundAmount : satoshis
    const amount = direction === 'Paying to mainnet' ? satoshis - calcOnchainOutputFee() : satoshis
    const fees = total - amount > 0 ? total - amount : 0
    setDetails({
      destination,
      direction,
      fees,
      satoshis: amount,
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
    saveTransactionActivityMetadata(txid, {
      destination: details?.destination,
      networkFee: details?.fees,
    })
    // Refresh now instead of waiting on the worker's VTXO_UPDATE broadcast:
    // that message rides on the indexer subscription, and for a transaction
    // this wallet submitted itself it can arrive late or not at all, leaving
    // the balance and the history a payment behind until a manual refresh.
    // The worker persists the spent inputs and the change VTXO before it hands
    // back the txid, so its cache is already current — and the metadata saved
    // just above is what the refreshed history grafts onto this row.
    reloadWallet().catch(consoleError)
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

  /**
   * Fund the covenant. That is the whole of the wallet's job.
   *
   * Funding IS acceptance — the protocol has no accept message — so once the
   * covenant is funded the payment is committed and under way: the solver pays
   * the invoice and claims, and if it cannot, the covenant refunds without
   * needing anything further from us. Waiting here for the solver to finish
   * meant the user watched a spinner through the solver's whole pipeline
   * (notice the funding, route the payment, claim) for an outcome they cannot
   * influence and that resolves in their favour either way.
   *
   * The success screen says "on the way" rather than "sent" for exactly this
   * reason: at this instant the invoice is not paid yet, and the wording has to
   * match what is actually true.
   */
  const payLightning = async (request: LnSendRequest) => {
    const txid = await sendOffChain(svcWallet!, request.fundAmount, request.address)
    if (!txid) return handleError('Error sending transaction')
    // Hand the swap over before `handleTxid` triggers the refresh that rebuilds
    // history: the record is what makes this row a Lightning send rather than a
    // bare outgoing payment, and it is what the manager drives from here on —
    // including the refund, which nothing else in the wallet will push. A store
    // that refuses leaves the payment committed and unmonitored, so it is
    // reported and not raised: the covenant is funded either way.
    await trackLnSend({
      rfqId: request.rfqId,
      lockupAddress: request.address,
      amount: request.fundAmount,
      fundingTxid: txid,
      ...request.record,
    }).catch((err) => consoleError(err, 'error tracking lightning send'))
    handleTxid(txid)
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
    } else if (invoice && pendingLnSend) {
      // RFQ Lightning send. The address below is the wallet's OWN derivation
      // of the lockup covenant (the client refuses a mismatched quote), so
      // funding it IS the acceptance — no further message exists. The solver
      // observes the funding, pays the invoice, and claims with the preimage;
      // a failed swap refunds by covenant.
      if (Math.floor(Date.now() / 1000) >= pendingLnSend.validUntil) {
        return handleError('Quote expired — go back and try again')
      }
      payLightning(pendingLnSend).catch(handleError)
    } else if (address) {
      if (!details.total) return handleError('Missing total amount')
      if (!details.satoshis) return handleError('Missing satoshis amount')
      collaborativeExitWithFees(svcWallet, details.total, details.satoshis, address)
        .then((txId: string) => handleTxid(txId))
        .catch(handleError)
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
