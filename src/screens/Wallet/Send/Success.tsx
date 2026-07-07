import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../../providers/flow'
import { NotificationsContext } from '../../../providers/notifications'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import Success from '../../../components/Success'
import CenterScreen from '../../../components/CenterScreen'
import FlexCol from '../../../components/FlexCol'
import Padded from '../../../components/Padded'
import Text from '../../../components/Text'
import SuccessIcon from '../../../icons/Success'
import SpinnerIcon from '../../../icons/Spinner'
import { prettyAmount, prettyFiatAmount } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { FiatContext } from '../../../providers/fiat'
import { WalletContext } from '../../../providers/wallet'
import { SwapsContext } from '../../../providers/swaps'
import AssetCard from '../../../components/AssetCard'
import { prettyAssetAmount } from '../../../lib/assets'
import { consoleError } from '../../../lib/logs'
import { BoltzSwap, BoltzSwapStatus, hasSubmarineStatusReached, isSubmarineFailedStatus } from '@arkade-os/boltz-swap'

type LnSendStatus = 'processing' | 'completed' | 'failed' | 'refunded'

// Maps the persisted swap to the optimistic-send UI status. The payment is
// shown as completed once Boltz has paid the invoice ("invoice.paid" or any
// later status); failures surface so refunds are never silent.
const deriveLnSendStatus = (swap: BoltzSwap): LnSendStatus => {
  const status = swap.status as BoltzSwapStatus
  if ((swap.type === 'submarine' && swap.refunded) || status === 'transaction.refunded') return 'refunded'
  if (isSubmarineFailedStatus(status) || status === 'invoice.expired' || status === 'transaction.failed')
    return 'failed'
  if (hasSubmarineStatusReached(status, 'invoice.paid')) return 'completed'
  return 'processing'
}

const lnStatusUI: Record<LnSendStatus, { color: string; label: string }> = {
  processing: { color: 'yellow', label: 'Processing' },
  completed: { color: 'green', label: 'Completed' },
  failed: { color: 'red', label: 'Failed' },
  refunded: { color: 'red', label: 'Refunded' },
}

export default function SendSuccess() {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { sendInfo } = useContext(FlowContext)
  const { notifyPaymentSent } = useContext(NotificationsContext)
  const { assetMetadataCache } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const { getSwapHistory, swapManager } = useContext(SwapsContext)

  const isAssetSend = Boolean(sendInfo.assets?.length)
  const assetId = sendInfo.assets?.[0]?.assetId
  const assetMeta = assetId ? assetMetadataCache.get(assetId) : undefined
  const assetName = assetMeta?.metadata?.name ?? 'Unknown Asset'
  const assetTicker = assetMeta?.metadata?.ticker ?? ''
  const assetIcon = assetMeta?.metadata?.icon
  const assetAmountValue = sendInfo.assets?.[0]?.amount ?? BigInt(0)
  const assetDecimals = assetMeta?.metadata?.decimals ?? 8

  // Lightning sends resolve optimistically once the swap is funded; track the
  // settlement happening in the background and reflect it live on screen.
  const pendingSwap = sendInfo.pendingSwap
  const isLnSwapSend = !isAssetSend && pendingSwap?.type === 'submarine'
  const [lnStatus, setLnStatus] = useState<LnSendStatus>('processing')

  // Show payment sent notification
  useEffect(() => {
    if (sendInfo.total) notifyPaymentSent(sendInfo.total)
  }, [sendInfo.total])

  useEffect(() => {
    if (!isLnSwapSend || !pendingSwap) return

    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    const stopPolling = () => {
      if (interval) clearInterval(interval)
      interval = null
    }

    const applyUpdate = (swap: BoltzSwap) => {
      if (cancelled || swap.id !== pendingSwap.id) return
      const next = deriveLnSendStatus(swap)
      setLnStatus(next)
      if (next !== 'processing') stopPolling()
    }

    // Real-time updates via SwapManager (when enabled)
    let unsub: (() => void) | null = null
    swapManager
      ?.subscribeToSwapUpdates(pendingSwap.id, applyUpdate)
      .then((unsubscribe) => {
        if (cancelled) unsubscribe()
        else unsub = unsubscribe
      })
      .catch((err) => consoleError(err, 'Failed to subscribe to swap updates'))

    // Fallback: the background monitor keeps the stored swap up to date even
    // without SwapManager, so poll the repository until a terminal status.
    interval = setInterval(() => {
      getSwapHistory()
        .then((swaps) => {
          const swap = swaps.find((s) => s.id === pendingSwap.id)
          if (swap) applyUpdate(swap)
        })
        .catch((err) => consoleError(err, 'Failed to refresh swap status'))
    }, 3000)

    return () => {
      cancelled = true
      stopPolling()
      unsub?.()
    }
  }, [isLnSwapSend, pendingSwap, swapManager, getSwapHistory])

  const totalSats = sendInfo.total ?? 0
  const displayAmount = isAssetSend
    ? `${prettyAssetAmount(assetAmountValue, assetDecimals)} ${assetTicker}`
    : useFiat
      ? prettyFiatAmount(toFiat(totalSats), config.currency, { bitcoinUnit: config.unit })
      : prettyAmount(totalSats)

  if (isAssetSend && assetId) {
    return (
      <>
        <Header text='Success' />
        <Content>
          <Padded>
            <FlexCol gap='1.5rem' centered padding='1rem 0 0 0'>
              <SuccessIcon small />
              <Text centered big bold>
                Payment sent!
              </Text>
              <AssetCard
                assetId={assetId}
                balance={assetAmountValue}
                decimals={assetDecimals}
                icon={assetIcon}
                name={assetName}
                ticker={assetTicker}
              />
              <Text centered color='neutral-700' thin small wrap>
                {displayAmount} sent successfully
              </Text>
            </FlexCol>
          </Padded>
        </Content>
        <ButtonsOnBottom>
          <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
        </ButtonsOnBottom>
      </>
    )
  }

  if (isLnSwapSend) {
    const failed = lnStatus === 'failed' || lnStatus === 'refunded'
    const { color, label } = lnStatusUI[lnStatus]
    const headline = failed ? 'Payment failed' : 'Payment sent!'
    const text =
      lnStatus === 'processing'
        ? `${displayAmount} is on its way.`
        : lnStatus === 'completed'
          ? `${displayAmount} sent successfully`
          : lnStatus === 'refunded'
            ? 'The Lightning payment failed and your funds have been refunded.'
            : 'The Lightning payment failed. Your funds will be refunded automatically.'

    return (
      <>
        <Header text={failed ? 'Payment failed' : 'Success'} />
        <Content>
          <CenterScreen>
            {lnStatus === 'processing' ? <SpinnerIcon /> : failed ? null : <SuccessIcon />}
            <Text centered big medium heading wrap testId='ln-send-headline'>
              {headline}
            </Text>
            <Text bold color={color} testId='ln-send-status'>
              {label}
            </Text>
            <Text centered color='neutral-700' thin small wrap>
              {text}
            </Text>
          </CenterScreen>
        </Content>
        <ButtonsOnBottom>
          <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
        </ButtonsOnBottom>
      </>
    )
  }

  return (
    <>
      <Header text='Success' />
      <Content>
        <Success headline='Payment sent!' text={`${displayAmount} sent successfully`} />
      </Content>
      <ButtonsOnBottom>
        <Button label='Sounds good' onClick={() => navigate(Pages.Wallet)} />
      </ButtonsOnBottom>
    </>
  )
}
