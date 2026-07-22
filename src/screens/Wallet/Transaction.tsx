import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { isBurn, isIssuance, prettyAgo, prettyCurrencyAssetAmount, prettyDate } from '../../lib/format'
import { defaultFee } from '../../lib/constants'
import ErrorMessage from '../../components/Error'
import { extractError } from '../../lib/error'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Info from '../../components/Info'
import FlexCol from '../../components/FlexCol'
import WaitingForRound from '../../components/WaitingForRound'
import { sleep } from '../../lib/sleep'
import Text, { TextSecondary } from '../../components/Text'
import AssetAvatar from '../../components/AssetAvatar'
import Details, { DetailsProps } from '../../components/Details'
import TokenLogo, { tokenLogoTickerForTicker, trustedAssetTickers } from '../../components/TokenLogo'
import VtxosIcon from '../../icons/Vtxos'
import CheckMarkIcon from '../../icons/CheckMark'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { LimitsContext } from '../../providers/limits'
import { getInputsToSettle } from '../../lib/asp'
import SwapTransactionSummary from '../../components/SwapTransactionSummary'
import {
  formatSwapAssetAmount,
  swapFeeAmount,
  swapPriceRateLabel,
  swapStatusLabel,
  type SwapStatus,
} from '../../lib/swapDisplay'
import { FiatContext } from '../../providers/fiat'
import { designatedAccountCurrency, fiatAccountAssetSatoshis } from '../../lib/accountAssets'
import UnverifiedBadge from '../../components/UnverifiedBadge'
import { AssetSwapsContext } from '../../providers/assetSwaps'
import { hapticTap } from '../../lib/haptics'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'

export default function Transaction() {
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { txInfo } = useContext(FlowContext)
  const { cancelSwap, swaps } = useContext(AssetSwapsContext)
  const { fromFiatAmount } = useContext(FiatContext)
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const { assetMetadataCache, isVerifiedAsset, settlePreconfirmed, vtxos, vtxoManager, wallet, svcWallet } =
    useContext(WalletContext)

  const liveSwap = txInfo?.assetSwap?.fundingTxid
    ? swaps.find((swap) => swap.fundingTxid === txInfo.assetSwap?.fundingTxid)
    : undefined
  const liveSwapStatus: SwapStatus | undefined = liveSwap
    ? liveSwap.status === 'fulfilled'
      ? 'completed'
      : liveSwap.status === 'cancelled'
        ? 'cancelled'
        : liveSwap.status === 'recoverable'
          ? 'recoverable'
          : 'pending'
    : undefined
  const tx =
    txInfo && txInfo.assetSwap && liveSwap && liveSwapStatus
      ? {
          ...txInfo,
          preconfirmed: liveSwapStatus === 'pending',
          settled: liveSwapStatus === 'completed' || liveSwapStatus === 'cancelled',
          redeemTxid: liveSwap.spentTxid ?? txInfo.redeemTxid,
          assetSwap: {
            ...txInfo.assetSwap,
            status: liveSwapStatus,
            fillTxid: liveSwap.spentTxid,
          },
        }
      : txInfo
  const swapTx = tx?.type === 'swap'
  const issuanceTx = tx ? isIssuance(tx) : false
  const burnTx = tx ? isBurn(tx) : false
  const boardingTx = Boolean(tx?.boardingTxid)
  const defaultButtonLabel = 'Settle transaction'
  const boardingExitDelay = Number(aspInfo?.boardingExitDelay || 0)
  const unconfirmedBoardingTx = boardingTx && !tx?.createdAt
  const expiredBoardingTx =
    !tx?.settled && boardingTx && tx?.createdAt && Date.now() / 1000 - tx?.createdAt > boardingExitDelay

  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel)
  const [amountAboveDust, setAmountAboveDust] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [hasInputsToSettle, setHasInputsToSettle] = useState(false)
  const [reminderIsOpen, setReminderIsOpen] = useState(false)
  const [settleSuccess, setSettleSuccess] = useState(false)
  const [settling, setSettling] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [cancelFailed, setCancelFailed] = useState(false)
  const [cancellingSwap, setCancellingSwap] = useState(false)

  useEffect(() => {
    setButtonLabel(settling ? 'Settling...' : defaultButtonLabel)
  }, [settling, defaultButtonLabel])

  useEffect(() => {
    if (!tx) return
    const bestMarketHour = calcBestMarketHour(wallet.nextRollover)
    if (bestMarketHour) {
      setStartTime(Number(bestMarketHour.nextStartTime))
      setDuration(Number(bestMarketHour.duration))
    } else {
      setStartTime(wallet.nextRollover)
      setDuration(0)
    }
  }, [wallet.nextRollover])

  useEffect(() => {
    if (!aspInfo || !svcWallet || !vtxoManager) return
    getInputsToSettle(svcWallet, vtxoManager, wallet.thresholdMs).then(({ inputs }) => {
      setHasInputsToSettle(inputs.length > 0)
      const totalAmount = inputs.reduce((a, v) => a + v.value, 0) || 0
      setAmountAboveDust(totalAmount > aspInfo.dust)
    })
  }, [aspInfo, vtxos, svcWallet, vtxoManager, wallet.thresholdMs])

  const handleSettle = async () => {
    setError('')
    setSettling(true)
    try {
      await settlePreconfirmed()
      await sleep(2000) // give time to read last message
      setSettleSuccess(true)
    } catch (err) {
      setError(extractError(err))
    }
    setSettling(false)
  }

  const handleCancelSwap = async () => {
    if (!liveSwap || cancellingSwap) return
    hapticTap()
    setCancelConfirmOpen(false)
    setCancelFailed(false)
    setError('')
    setCancellingSwap(true)
    try {
      await cancelSwap(liveSwap.id)
    } catch (err) {
      setError(extractError(err))
      setCancelFailed(true)
    } finally {
      setCancellingSwap(false)
    }
  }

  if (!tx) return <></>

  const accountAssetValues = tx.assets?.map((asset) => {
    const metadata = assetMetadataCache.get(asset.assetId)?.metadata
    const currency = isVerifiedAsset(asset.assetId)
      ? designatedAccountCurrency(aspInfo.network, asset.assetId)
      : undefined
    return fiatAccountAssetSatoshis(BigInt(asset.amount), metadata?.decimals ?? 8, currency, fromFiatAmount)
  })
  const accountValueSatoshis =
    accountAssetValues?.length && accountAssetValues.every((value) => value !== undefined)
      ? accountAssetValues.reduce((total, value) => total + value, 0)
      : undefined

  const status = expiredBoardingTx
    ? 'Expired'
    : unconfirmedBoardingTx
      ? 'Unconfirmed'
      : boardingTx && tx.preconfirmed
        ? 'Pending boarding'
        : settleSuccess || tx.settled
          ? 'Settled'
          : 'Preconfirmed'

  const fees = tx.type === 'sent' ? defaultFee : 0
  // on asset transfers tx.amount is just the dust carrying the asset — showing
  // it as Amount/Total reads as a fiat price for the asset, so hide both rows
  // unless the asset resolves to a designated account value
  const assetTransfer = Boolean(tx.assets?.length)
  const accountTransferSatoshis = accountValueSatoshis === undefined ? undefined : Math.abs(accountValueSatoshis)
  const transferSatoshis = accountTransferSatoshis ?? (tx.type === 'sent' ? tx.amount - defaultFee : tx.amount)
  const when = tx.createdAt ? prettyAgo(tx.createdAt) : !unconfirmedBoardingTx ? 'Unknown' : 'Unconfirmed'
  const date = tx.createdAt ? prettyDate(tx.createdAt) : !unconfirmedBoardingTx ? 'Unknown' : 'Unconfirmed'
  const txid = tx.boardingTxid || tx.redeemTxid || tx.roundTxid || ''

  const details: DetailsProps = swapTx
    ? {
        date,
        fees: 0,
        fundedTxid: tx.assetSwap?.fundingTxid,
        priceRate: swapPriceRateLabel(tx),
        spendLabel: tx.assetSwap?.status === 'cancelled' ? 'Cancelled' : 'Completed',
        spendTxid: tx.assetSwap?.fillTxid,
        status: swapStatusLabel(tx),
        swapFees: swapFeeAmount(tx),
        swapFrom: formatSwapAssetAmount(tx, 'from'),
        swapTo: formatSwapAssetAmount(tx, 'to'),
        type: 'Swap',
        wallet,
        when,
      }
    : {
        assetId: tx.assets?.[0]?.assetId,
        date,
        direction: issuanceTx ? 'Issuance' : burnTx ? 'Burn' : tx.type === 'sent' ? 'Sent' : 'Received',
        fees,
        isOffchainTx: !tx.boardingTxid && (Boolean(tx.redeemTxid) || Boolean(tx.roundTxid)),
        satoshis: accountTransferSatoshis ?? (assetTransfer ? undefined : transferSatoshis),
        status,
        total: accountTransferSatoshis !== undefined ? transferSatoshis + fees : assetTransfer ? undefined : tx.amount,
        txid,
        type: boardingTx ? 'Boarding' : 'Offchain',
        wallet,
        when,
      }

  const swapFromIcon = tx.assetSwap?.fromAssetId
    ? assetMetadataCache.get(tx.assetSwap.fromAssetId)?.metadata?.icon
    : undefined
  const swapToIcon = tx.assetSwap?.toAssetId
    ? assetMetadataCache.get(tx.assetSwap.toAssetId)?.metadata?.icon
    : undefined
  const showCancelSwap = swapTx && liveSwap && (liveSwap.status === 'pending' || liveSwap.status === 'cancelling')
  const visibleError = cancelFailed && !showCancelSwap ? '' : error

  const Body = () => (
    <Content>
      <Padded>
        <FlexCol>
          <ErrorMessage error={Boolean(visibleError)} text={visibleError} />
          {expiredBoardingTx ? (
            <Info color='red' icon={<VtxosIcon />} title='Expired'>
              <Text wrap>Boarding transaction expired.</Text>
            </Info>
          ) : unconfirmedBoardingTx ? (
            <Info color='orange' icon={<VtxosIcon />} title='Unconfirmed'>
              <Text wrap>Onchain transaction unconfirmed. Please wait for confirmation.</Text>
            </Info>
          ) : tx.preconfirmed && tx.boardingTxid ? (
            <Info color='orange' icon={<VtxosIcon />} title='Pending boarding'>
              <Text wrap>Onboard transaction confirmed on-chain.</Text>
            </Info>
          ) : null}
          {settleSuccess ? (
            <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
              <TextSecondary>Transaction settled successfully</TextSecondary>
            </Info>
          ) : null}
          {swapTx && tx.assetSwap ? (
            <SwapTransactionSummary fromIcon={swapFromIcon} toIcon={swapToIcon} tx={tx} />
          ) : null}
          {!swapTx && tx.assets?.length ? (
            <div className='transaction-detail__assets'>
              {tx.assets.map((a) => {
                const meta = assetMetadataCache.get(a.assetId)?.metadata
                const ticker = meta?.ticker
                const name = meta?.name
                const icon = meta?.icon
                const decimals = meta?.decimals ?? 8
                // only verified asset IDs get currency treatment for their ticker
                const trusted = isVerifiedAsset(a.assetId)
                const designatedCurrency = trusted ? designatedAccountCurrency(aspInfo.network, a.assetId) : undefined
                const { accountTicker, trustedTicker } = trustedAssetTickers(designatedCurrency ?? ticker, trusted)
                const label = accountTicker ?? trustedTicker ?? name ?? `${a.assetId.slice(0, 8)}...`
                const amountLabel = accountTicker ?? trustedTicker
                const tokenLogoTicker = tokenLogoTickerForTicker(trustedTicker)
                return (
                  <div key={a.assetId} className='transaction-detail-asset'>
                    <span className='transaction-detail-asset__logo'>
                      {tokenLogoTicker ? (
                        <TokenLogo ticker={tokenLogoTicker} />
                      ) : (
                        <AssetAvatar icon={icon} ticker={ticker} size={36} assetId={a.assetId} clickable />
                      )}
                    </span>
                    <div className='transaction-detail-asset__copy'>
                      <span className='transaction-detail-asset__amount'>
                        {prettyCurrencyAssetAmount(BigInt(a.amount), decimals, amountLabel)} {label}
                        {!trusted ? <UnverifiedBadge /> : null}
                      </span>
                      {name && ticker && !accountTicker ? (
                        <span className='transaction-detail-asset__name'>{name}</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
          <Details details={details} variant='receipt' />
        </FlexCol>
      </Padded>
    </Content>
  )

  // if server defines that UTXO transactions are not allowed,
  // don't allow settlement since it is a UTXO transaction.
  const showSettleButtons =
    status === 'Preconfirmed' &&
    hasInputsToSettle &&
    utxoTxsAllowed() &&
    vtxoTxsAllowed() &&
    !unconfirmedBoardingTx &&
    !expiredBoardingTx &&
    amountAboveDust &&
    !settling

  const Buttons = () =>
    showCancelSwap ? (
      <>
        <ButtonsOnBottom>
          <Button
            variant='destructive'
            label={
              cancellingSwap
                ? 'Cancelling…'
                : cancelFailed || liveSwap.status === 'cancelling'
                  ? 'Retry cancel'
                  : 'Cancel swap'
            }
            disabled={cancellingSwap}
            onClick={() => setCancelConfirmOpen(true)}
          />
        </ButtonsOnBottom>
        <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel swap?</AlertDialogTitle>
              <AlertDialogDescription>
                If the swap is still pending, this will return its locked funds to your wallet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className='min-h-11'>Keep swap</AlertDialogCancel>
              <AlertDialogAction className='min-h-11' variant='destructive' onClick={handleCancelSwap}>
                Cancel swap
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    ) : showSettleButtons ? (
      <>
        <ButtonsOnBottom>
          <Button onClick={handleSettle} label={buttonLabel} disabled={settling} />
          <Button onClick={() => setReminderIsOpen(true)} label='Add reminder' secondary />
        </ButtonsOnBottom>
        <Reminder
          isOpen={reminderIsOpen}
          callback={() => setReminderIsOpen(false)}
          duration={duration}
          name='Settle transaction'
          startTime={startTime}
        />
      </>
    ) : null

  return (
    <>
      <Header text='Transaction' back />
      {settling ? <WaitingForRound settle /> : <Body />}
      <Buttons />
    </>
  )
}
