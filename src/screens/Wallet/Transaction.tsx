import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Padded from '../../components/Padded'
import { WalletContext } from '../../providers/wallet'
import { FlowContext } from '../../providers/flow'
import { isBurn, isIssuance, prettyDate } from '../../lib/format'
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
import Details, { DetailsProps } from '../../components/Details'
import VtxosIcon from '../../icons/Vtxos'
import CheckMarkIcon from '../../icons/CheckMark'
import { AspContext } from '../../providers/asp'
import Reminder from '../../components/Reminder'
import { LimitsContext } from '../../providers/limits'
import { getInputsToSettle } from '../../lib/asp'
import SwapTransactionSummary from '../../components/SwapTransactionSummary'
import {
  carrierDetails,
  formatSwapAssetAmount,
  swapAmountBeforeFee,
  swapFeeAmount,
  swapPriceRateLabel,
  swapStatusLabel,
  type SwapStatus,
} from '../../lib/swapDisplay'
import { AssetSwapsContext } from '../../providers/assetSwaps'
import { hapticTap } from '../../lib/haptics'
import { useTransactionAmountDisplay } from '../../hooks/useTransactionAmountDisplay'
import { useLnSendReceipt } from '../../hooks/useLnSendReceipt'
import TransactionAmountSummary from '../../components/TransactionAmountSummary'
import { isCanonicalTxid } from '../../lib/carrierActivity'
import { useTranslation } from '../../providers/language'
import { ClientErrorCode, TaxiError } from '@arkade-taxi/client'
import { ReceiverClaimsContext } from '../../providers/receiverClaims'
import { claimKey } from '../../lib/receiverClaims'
import { PendingDirectTaxi, ReturnedDirectTaxi, checkTaxiPayment, getPendingDirectTaxi } from '../../lib/directTaxiSend'
import {
  isTaxiOnlyTx,
  taxiActivityKey,
  taxiActivityTxids,
  taxiActivityView,
  taxiCarrierRows,
  type TaxiTone,
} from '../../lib/taxiActivity'
import { consoleError } from '../../lib/logs'
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

const TAXI_INFO_COLOR: Record<TaxiTone, string> = {
  pending: 'orange',
  failed: 'red',
  done: 'green',
  void: 'neutral-500',
}
const TAXI_MODE_KEY = {
  recycle: 'transaction.taxiModeRecycle',
  purchase: 'transaction.taxiModePurchase',
  sponsored: 'transaction.taxiModeSponsored',
} as const

export default function Transaction() {
  const { utxoTxsAllowed, vtxoTxsAllowed } = useContext(LimitsContext)
  const { txInfo } = useContext(FlowContext)
  const { cancelSwap, swaps } = useContext(AssetSwapsContext)
  const { aspInfo, calcBestMarketHour } = useContext(AspContext)
  const {
    assetMetadataCache,
    isVerifiedAsset,
    reloadWallet,
    settlePreconfirmed,
    txs,
    vtxos,
    vtxoManager,
    wallet,
    svcWallet,
  } = useContext(WalletContext)
  const { claimable, openClaim } = useContext(ReceiverClaimsContext)
  const { language, t } = useTranslation()

  // By record key, not historyKey: the record survives its Taxi-only row giving way to the SDK row.
  const taxiKey = txInfo?.taxi && taxiActivityKey(txInfo.taxi)
  const taxi = txs.find((row) => row.taxi && taxiActivityKey(row.taxi) === taxiKey)?.taxi ?? txInfo?.taxi
  const [pendingTransfer, setPendingTransfer] = useState<string>()
  const [checkingTaxi, setCheckingTaxi] = useState(false)
  const taxiView =
    taxi &&
    taxiActivityView(taxi, {
      claimable: claimable.has(claimKey(taxi.taxiUrl, taxi.transferId)),
      pending: pendingTransfer === taxi.transferId,
    })
  const taxiSender = taxi?.role === 'sender'

  useEffect(() => {
    if (!taxiSender || !svcWallet || checkingTaxi) return
    let active = true
    getPendingDirectTaxi(svcWallet, aspInfo.network)
      .then((payment) => {
        if (active) setPendingTransfer(payment?.record.transferId)
      })
      .catch((err) => consoleError(err, 'could not read the pending Taxi payment'))
    return () => {
      active = false
    }
  }, [taxiSender, svcWallet, aspInfo.network, checkingTaxi])

  const stableSwap = txInfo?.assetSwap ? swaps.find((swap) => txInfo.historyKey === `swap:${swap.id}`) : undefined
  const fundingTxid = txInfo?.assetSwap?.fundingTxid
  const liveSwap = stableSwap ?? (fundingTxid ? swaps.find((swap) => swap.fundingTxid === fundingTxid) : undefined)
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
            fundingTxid: liveSwap.fundingTxid,
            status: liveSwapStatus,
            fillTxid: liveSwap.spentTxid,
          },
        }
      : txInfo
  const swapTx = tx?.type === 'swap'
  const amountDisplay = useTransactionAmountDisplay(tx)
  const lnSendReceipt = useLnSendReceipt(tx, t)
  const issuanceTx = tx
    ? tx.assetAction === 'issued' || tx.assetAction === 'reissued' || (!tx.assetAction && isIssuance(tx))
    : false
  const burnTx = tx ? tx.assetAction === 'burned' || (!tx.assetAction && isBurn(tx)) : false
  const exitTx = tx?.type === 'exit'
  const boardingTx = Boolean(tx?.boardingTxid)
  const defaultButtonLabel = boardingTx ? t('transaction.completeBoarding') : t('transaction.settleTransaction')
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
    setButtonLabel(settling ? t('transaction.settling') : defaultButtonLabel)
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

  const taxiCheckError = (err: unknown): string => {
    if (err instanceof ReturnedDirectTaxi) return ''
    const cause = err instanceof PendingDirectTaxi ? err.cause : err
    return cause instanceof TaxiError && (cause.code === ClientErrorCode.Network || cause.code === ClientErrorCode.Http)
      ? t('transaction.taxiUnreachable')
      : extractError(cause)
  }

  const handleTaxiCheck = async () => {
    if (!taxi || checkingTaxi) return
    hapticTap()
    setError('')
    setCheckingTaxi(true)
    try {
      await checkTaxiPayment(taxi, svcWallet)
    } catch (err) {
      setError(taxiCheckError(err))
    } finally {
      setCheckingTaxi(false)
    }
    reloadWallet().catch(consoleError)
  }

  if (!tx) return <></>

  // Status booleans mirror the state machine; the translated `status` string is
  // display-only so control flow never depends on the active locale.
  const statusExpired = Boolean(expiredBoardingTx)
  const statusUnconfirmed = Boolean(unconfirmedBoardingTx)
  const statusPendingBoarding = Boolean(boardingTx && tx.preconfirmed)
  const statusSettled = Boolean(settleSuccess || tx.settled)
  const statusPreconfirmed = !statusExpired && !statusUnconfirmed && !statusPendingBoarding && !statusSettled

  const status = statusExpired
    ? t('transaction.expired')
    : statusUnconfirmed
      ? t('transaction.unconfirmed')
      : statusPendingBoarding
        ? t('transaction.pendingBoarding')
        : statusSettled
          ? t('transaction.settled')
          : t('transaction.preconfirmed')

  const fees = tx.networkFee ?? (tx.type === 'sent' ? defaultFee : 0)
  // On asset transfers tx.amount is only the data carrier, not the asset value.
  // The asset-aware rows below replace the legacy Amount/Total rows.
  const assetTransfer = Boolean(tx.assets?.length)
  const summaryLabel =
    tx.assetAction === 'reissued'
      ? t('transaction.amountReissued')
      : issuanceTx
        ? t('transaction.amountIssued')
        : burnTx
          ? t('transaction.amountBurned')
          : exitTx
            ? t('transaction.amountExited')
            : tx.type === 'sent'
              ? t('transaction.amountSent')
              : t('transaction.amountReceived')
  const date = tx.createdAt
    ? prettyDate(tx.createdAt, language)
    : !unconfirmedBoardingTx
      ? t('common.unknown')
      : t('transaction.unconfirmed')
  const txid = tx.boardingTxid || tx.redeemTxid || tx.roundTxid || ''
  const displayedAssets = amountDisplay?.raw.filter((amount) => amount.assetId) ?? []
  const assetIds = displayedAssets.map((amount) => ({
    assetId: amount.assetId!,
    label:
      displayedAssets.length === 1
        ? amount.unverified
          ? t('transaction.assetIdUnverified')
          : t('transaction.assetId')
        : amount.unverified
          ? t('transaction.assetIdTickerUnverified', { ticker: amount.ticker })
          : t('transaction.assetIdTicker', { ticker: amount.ticker }),
  }))
  const assetTotals = assetTransfer
    ? amountDisplay?.raw.map((amount) => ({
        ...amount,
        label:
          amountDisplay.raw.length === 1 ? t('common.total') : t('transaction.totalTicker', { ticker: amount.ticker }),
      }))
    : undefined
  const swapAssetIds = [
    tx.assetSwap?.fromAssetId && tx.assetSwap.fromAssetId !== 'btc'
      ? {
          assetId: tx.assetSwap.fromAssetId,
          label: isVerifiedAsset(tx.assetSwap.fromAssetId)
            ? t('transaction.fromAssetId')
            : t('transaction.fromAssetIdUnverified'),
        }
      : undefined,
    tx.assetSwap?.toAssetId && tx.assetSwap.toAssetId !== 'btc'
      ? {
          assetId: tx.assetSwap.toAssetId,
          label: isVerifiedAsset(tx.assetSwap.toAssetId)
            ? t('transaction.toAssetId')
            : t('transaction.toAssetIdUnverified'),
        }
      : undefined,
  ].filter((entry): entry is { assetId: string; label: string } => Boolean(entry))
  const swapReceived = swapTx ? formatSwapAssetAmount(tx, 'to') : undefined
  const taxiAsset = taxi?.assetId ? assetMetadataCache.get(taxi.assetId)?.metadata : undefined
  const carrierDetailsProps =
    taxi && !tx.carrier ? taxiCarrierRows(taxi, language, taxiAsset) : carrierDetails(tx?.carrier, language)
  const taxiOnly = isTaxiOnlyTx(tx)
  const taxiDetails = taxi
    ? {
        url: taxi.taxiUrl.replace(/^https?:\/\//, ''),
        transferId: taxi.transferId,
        mode: taxi.mode && t(TAXI_MODE_KEY[taxi.mode]),
        updated: prettyDate(taxi.updatedAt, language),
      }
    : tx.carrier?.taxi
  const relatedTxids = [...(tx.carrierMembers?.map(({ txid }) => txid) ?? []), ...(taxi ? taxiActivityTxids(taxi) : [])]

  const details: DetailsProps = swapTx
    ? {
        assetIds: swapAssetIds,
        assetTotals: swapReceived ? [{ ...swapReceived, label: t('transaction.totalReceived') }] : undefined,
        carrier: carrierDetailsProps,
        date,
        fees: 0,
        fundedTxid: tx.assetSwap?.fundingTxid,
        priceRate: swapPriceRateLabel(tx),
        relatedTxids,
        spendLabel: tx.assetSwap?.status === 'cancelled' ? t('transaction.cancelled') : t('transaction.completed'),
        spendTxid: tx.assetSwap?.fillTxid,
        status: swapStatusLabel(tx, t),
        swapFees: swapFeeAmount(tx),
        swapFrom: formatSwapAssetAmount(tx, 'from'),
        // restored swaps may lack feeBps (market card unreachable during the
        // scan): show the net received amount rather than dropping the row
        swapTo: swapAmountBeforeFee(tx) ?? swapReceived,
        taxi: taxiDetails,
        wallet,
      }
    : {
        amountDisplay,
        assetIds,
        assetTotals,
        carrier: carrierDetailsProps,
        date,
        destination: tx.type === 'sent' && !boardingTx && !issuanceTx && !burnTx ? tx.destination : undefined,
        fees,
        // An exit is the one row whose txid is genuinely onchain, so it links
        // to the block explorer rather than to Arkade's. Without the guard its
        // `redeemTxid` alone would class it offchain and send the link to the
        // vmempool explorer, which has never heard of the transaction.
        isOffchainTx: !tx.boardingTxid && !exitTx && (Boolean(tx.redeemTxid) || Boolean(tx.roundTxid)),
        relatedTxids,
        // Details' fallback row only (amountDisplay owns the rendered rows):
        // gross, matching the hook's convention
        satoshis: assetTransfer ? undefined : tx.amount,
        status: taxiOnly ? undefined : status,
        taxi: taxiDetails,
        total: assetTransfer ? undefined : tx.amount,
        // A Lightning send is two txs, so it gets the same pair of rows an
        // asset swap does — funding, then the spend that ended it — in place
        // of a lone "Transaction ID" that would name only the first and say
        // nothing about whether the invoice was ever paid. Dropping txid is
        // how the swap branch above expresses the same thing.
        ...lnSendReceipt,
        txid: lnSendReceipt ? undefined : txid,
        type: boardingTx ? t('transaction.boarding') : undefined,
        wallet,
      }

  const swapFromIcon = tx.assetSwap?.fromAssetId
    ? assetMetadataCache.get(tx.assetSwap.fromAssetId)?.metadata?.icon
    : undefined
  const swapToIcon = tx.assetSwap?.toAssetId
    ? assetMetadataCache.get(tx.assetSwap.toAssetId)?.metadata?.icon
    : undefined
  const showCancelSwap =
    swapTx &&
    liveSwap &&
    isCanonicalTxid(liveSwap.fundingTxid) &&
    (liveSwap.status === 'pending' || liveSwap.status === 'cancelling')
  const visibleError = cancelFailed && !showCancelSwap ? '' : error

  const Body = () => (
    <Content>
      <Padded>
        <FlexCol>
          <ErrorMessage error={Boolean(visibleError)} text={visibleError} />
          {expiredBoardingTx ? (
            <Info color='red' icon={<VtxosIcon />} title={t('transaction.expired')}>
              <Text wrap>{t('transaction.boardingExpired')}</Text>
            </Info>
          ) : unconfirmedBoardingTx ? (
            <Info color='orange' icon={<VtxosIcon />} title={t('transaction.unconfirmed')}>
              <Text wrap>{t('transaction.unconfirmedText')}</Text>
            </Info>
          ) : tx.preconfirmed && tx.boardingTxid ? (
            <Info color='orange' icon={<VtxosIcon />} title={t('transaction.pendingBoarding')}>
              <Text wrap>{t('transaction.pendingBoardingText')}</Text>
            </Info>
          ) : null}
          {settleSuccess ? (
            <Info color='green' icon={<CheckMarkIcon small />} title={t('transaction.success')}>
              <TextSecondary>{t('transaction.settledSuccessfully')}</TextSecondary>
            </Info>
          ) : null}
          {taxiView ? (
            <Info color={TAXI_INFO_COLOR[taxiView.tone]} icon={<VtxosIcon />} title={t(taxiView.label)}>
              <Text wrap>{t(taxiView.explanation)}</Text>
              {taxi?.failureDetail ? <Text wrap>{taxi.failureDetail}</Text> : null}
              {taxi?.failureCode ? (
                <TextSecondary>{t('transaction.taxiFailureCode', { code: taxi.failureCode })}</TextSecondary>
              ) : null}
            </Info>
          ) : null}
          {swapTx && tx.assetSwap ? (
            <SwapTransactionSummary fromIcon={swapFromIcon} toIcon={swapToIcon} tx={tx} />
          ) : null}
          {amountDisplay ? <TransactionAmountSummary amount={amountDisplay} label={summaryLabel} /> : null}
          <Details details={details} variant='receipt' />
        </FlexCol>
      </Padded>
    </Content>
  )

  const showCompleteBoarding =
    statusPendingBoarding && utxoTxsAllowed() && vtxoTxsAllowed() && !settleSuccess && !settling

  // if server defines that UTXO transactions are not allowed,
  // don't allow settlement since it is a UTXO transaction.
  const showSettleButtons =
    statusPreconfirmed &&
    hasInputsToSettle &&
    utxoTxsAllowed() &&
    vtxoTxsAllowed() &&
    !unconfirmedBoardingTx &&
    !expiredBoardingTx &&
    amountAboveDust &&
    !settling

  const showSettleActions = showCompleteBoarding || showSettleButtons

  const claimTaxi = () => taxi && openClaim(claimKey(taxi.taxiUrl, taxi.transferId))

  const Buttons = () =>
    taxiView?.action === 'claim' ? (
      <ButtonsOnBottom>
        <Button label={t('transaction.taxiClaim')} onClick={claimTaxi} />
      </ButtonsOnBottom>
    ) : taxiView?.action === 'check' ? (
      <ButtonsOnBottom>
        <Button
          label={checkingTaxi ? t('transaction.taxiChecking') : t('transaction.taxiCheckAgain')}
          disabled={checkingTaxi}
          onClick={handleTaxiCheck}
        />
      </ButtonsOnBottom>
    ) : showCancelSwap ? (
      <>
        <ButtonsOnBottom>
          <Button
            variant='destructive'
            label={
              cancellingSwap
                ? t('transaction.cancelling')
                : cancelFailed || liveSwap.status === 'cancelling'
                  ? t('transaction.retryCancel')
                  : t('transaction.cancelSwap')
            }
            disabled={cancellingSwap}
            onClick={() => setCancelConfirmOpen(true)}
          />
        </ButtonsOnBottom>
        <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('transaction.cancelSwapTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('transaction.cancelSwapBody')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className='min-h-11'>{t('transaction.keepSwap')}</AlertDialogCancel>
              <AlertDialogAction className='min-h-11' variant='destructive' onClick={handleCancelSwap}>
                {t('transaction.cancelSwap')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    ) : showSettleActions ? (
      <>
        <ButtonsOnBottom>
          <Button onClick={handleSettle} label={buttonLabel} disabled={settling} />
          <Button onClick={() => setReminderIsOpen(true)} label={t('transaction.addReminder')} secondary />
        </ButtonsOnBottom>
        <Reminder
          isOpen={reminderIsOpen}
          callback={() => setReminderIsOpen(false)}
          duration={duration}
          name={boardingTx ? t('transaction.completeBoarding') : t('transaction.settleTransaction')}
          startTime={startTime}
        />
      </>
    ) : null

  return (
    <>
      <Header text={t('wallet.transaction')} back />
      {settling ? <WaitingForRound settle /> : <Body />}
      <Buttons />
    </>
  )
}
