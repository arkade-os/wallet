import { useCallback, useContext, useEffect, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import Table, { TableData } from '../../../components/Table'
import { FlowContext } from '../../../providers/flow'
import { decodeInvoice, isValidInvoice } from '../../../lib/bolt11'
import { prettyAgo, prettyAmount, prettyDate, prettyHide } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import {
  isSubmarineSwapRefundable,
  isChainSwapRefundable,
  isReverseSwapClaimable,
  isChainSwapClaimable,
} from '@arkade-os/boltz-swap'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { SwapsContext } from '../../../providers/swaps'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import ErrorMessage from '../../../components/Error'
import { TextSecondary } from '../../../components/Text'
import CheckMarkIcon from '../../../icons/CheckMark'
import Info from '../../../components/Info'
import LoadingLogo from '../../../components/LoadingLogo'
import FlexRow from '../../../components/FlexRow'
import { InfoIconDark } from '../../../icons/Info'

function friendlySwapError(message: string): string {
  const locktimeMatch = message.match(/locktime=(\d+)/)
  if (locktimeMatch) {
    const date = prettyDate(parseInt(locktimeMatch[1]))
    return `Refund not yet available. Your funds will be recoverable after ${date}.`
  }
  if (message.includes('VHTLC is already spent')) {
    return 'This swap has already been refunded or claimed.'
  }
  if (message.includes('VHTLC not found')) {
    return 'No funds found at the swap address. The swap may not have been funded.'
  }
  return message
}

export default function AppBoltzSwap() {
  const { config } = useContext(ConfigContext)
  const { swapInfo, setSwapInfo } = useContext(FlowContext)
  const { claimArk, claimBtc, claimVHTLC, refundArk, refundVHTLC, swapManager } = useContext(SwapsContext)

  const [error, setError] = useState<string>('')
  const [processing, setProcessing] = useState<boolean>(false)
  const [opDone, setOpDone] = useState(false)
  const [success, setSuccess] = useState<boolean>(false)

  // Subscribe to real-time updates for this swap
  useEffect(() => {
    if (!swapManager || !swapInfo) return

    let unsub: (() => void) | null = null
    let cancelled = false
    swapManager
      .subscribeToSwapUpdates(swapInfo.id, (updatedSwap) => {
        setSwapInfo(updatedSwap)
      })
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe()
        } else {
          unsub = unsubscribe
        }
      })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [swapManager, swapInfo?.id])

  if (!swapInfo) return null

  const formatAmount = (amt: number) => (config.showBalance ? prettyAmount(amt) : prettyHide(amt))

  const date = prettyDate(swapInfo.createdAt)
  const when = prettyAgo(swapInfo.createdAt)
  const swapId = swapInfo.response.id
  const preimage = swapInfo.preimage
  const status = swapInfo.status

  let tableData: TableData = []

  if (swapInfo.type === 'chain') {
    const sentSats = swapInfo.response.lockupDetails.amount
    const rcvdSats = swapInfo.response.claimDetails.amount
    const btcAddress =
      swapInfo.request.from === 'ARK'
        ? swapInfo.response.lockupDetails.lockupAddress
        : swapInfo.response.claimDetails.lockupAddress

    tableData = [
      ['When', when],
      ['Kind', 'Chain Swap'],
      ['Swap ID', swapId],
      ['Direction', swapInfo.request.from === 'ARK' ? 'Arkade to BTC' : 'BTC to Arkade'],
      ['Date', date],
      ['Preimage', preimage],
      ['BTC Address', btcAddress],
      ['Status', status],
      ['Amount', formatAmount(rcvdSats)],
      ['Fees', formatAmount(sentSats - rcvdSats)],
      ['Total', formatAmount(sentSats)],
    ]
  } else if (swapInfo.type === 'reverse') {
    const sentSats = swapInfo.request.invoiceAmount ?? 0
    const rcvdSats = swapInfo.response.onchainAmount ?? 0

    tableData = [
      ['When', when],
      ['Kind', 'Reverse Swap'],
      ['Swap ID', swapId],
      ['Direction', 'Lightning to Arkade'],
      ['Date', date],
      ['Preimage', preimage],
      ['Invoice', swapInfo.response.invoice],
      ['Status', swapInfo.status],
      ['Amount', formatAmount(rcvdSats)],
      ['Fees', formatAmount(sentSats - rcvdSats)],
      ['Total', formatAmount(sentSats)],
    ]
  } else if (swapInfo.type === 'submarine') {
    const sentSats = swapInfo.response.expectedAmount ?? 0
    const rcvdSats = isValidInvoice(swapInfo.request.invoice) ? decodeInvoice(swapInfo.request.invoice).amountSats : 0

    tableData = [
      ['When', when],
      ['Kind', 'Submarine Swap'],
      ['Swap ID', swapId],
      ['Direction', 'Arkade to Lightning'],
      ['Date', date],
      ['Preimage', preimage],
      ['Invoice', swapInfo.request.invoice],
      ['Status', status],
      ['Amount', formatAmount(rcvdSats)],
      ['Fees', formatAmount(sentSats - rcvdSats)],
      ['Total', formatAmount(sentSats)],
    ]
  }

  const isRefundable = isSubmarineSwapRefundable(swapInfo) || isChainSwapRefundable(swapInfo)
  const isClaimable = isReverseSwapClaimable(swapInfo) || isChainSwapClaimable(swapInfo)
  const buttonLabel = isClaimable ? 'Complete swap' : 'Refund swap'
  const refunded = swapInfo.status === 'transaction.refunded'

  const buttonHandler = async () => {
    try {
      setProcessing(true)
      if (isReverseSwapClaimable(swapInfo)) {
        await claimVHTLC(swapInfo)
        setSuccess(true)
      }
      if (isChainSwapClaimable(swapInfo)) {
        if (swapInfo.request.to === 'BTC') {
          await claimBtc(swapInfo)
        } else if (swapInfo.request.to === 'ARK') {
          await claimArk(swapInfo)
        }
        setSuccess(true)
      }
      if (isChainSwapRefundable(swapInfo)) {
        await refundArk(swapInfo)
        setSuccess(true)
      }
      if (isSubmarineSwapRefundable(swapInfo)) {
        await refundVHTLC(swapInfo)
        setSuccess(true)
      }
      // No need to manually refresh - SwapManager handles status updates
      setOpDone(true)
    } catch (error) {
      const raw = extractError(error)
      setError(friendlySwapError(raw))
      consoleError(error, `Error processing swap ${swapInfo?.id}`)
      setProcessing(false)
    }
  }

  const handleExitComplete = useCallback(() => {
    setProcessing(false)
  }, [])

  return (
    <>
      <Header text='Swap' back />
      <Content>
        <Padded>
          {processing ? (
            <LoadingLogo
              text='Processing swap...'
              done={opDone}
              exitMode='fly-up'
              onExitComplete={handleExitComplete}
            />
          ) : (
            <FlexCol gap='2rem'>
              <ErrorMessage error={Boolean(error)} text={error} />
              {success ? (
                <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
                  <TextSecondary>Swap {isRefundable ? 'refunded' : 'completed'}</TextSecondary>
                </Info>
              ) : refunded ? (
                <FlexRow alignItems='flex-start'>
                  <InfoIconDark color='green' />
                  <TextSecondary>Swap refunded</TextSecondary>
                </FlexRow>
              ) : null}
              <Table data={tableData} />
            </FlexCol>
          )}
        </Padded>
      </Content>
      {!success && (isRefundable || isClaimable) ? (
        <ButtonsOnBottom>
          <Button onClick={buttonHandler} label={buttonLabel} disabled={processing} />
        </ButtonsOnBottom>
      ) : null}
    </>
  )
}
