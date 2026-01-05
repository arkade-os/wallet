import { useContext, useEffect, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Table, { TableData } from '../../../components/Table'
import { FlowContext } from '../../../providers/flow'
import { decodeInvoice } from '../../../lib/bolt11'
import { prettyAgo, prettyAmount, prettyDate, prettyHide } from '../../../lib/format'
import { ConfigContext } from '../../../providers/config'
import { isSubmarineSwapRefundable, isReverseClaimableStatus } from '@arkade-os/boltz-swap'
import Button from '../../../components/Button'
import ButtonsOnBottom from '../../../components/ButtonsOnBottom'
import { LightningContext } from '../../../providers/lightning'
import { consoleError } from '../../../lib/logs'
import { extractError } from '../../../lib/error'
import ErrorMessage from '../../../components/Error'
import { TextSecondary } from '../../../components/Text'
import CheckMarkIcon from '../../../icons/CheckMark'
import Info from '../../../components/Info'
import Loading from '../../../components/Loading'
import FlexRow from '../../../components/FlexRow'
import { InfoIconDark } from '../../../icons/Info'

export default function AppBoltzSwap() {
  const { config } = useContext(ConfigContext)
  const { swapInfo, setSwapInfo } = useContext(FlowContext)
  const { claimVHTLC, refundVHTLC, swapManager } = useContext(LightningContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState<string>('')
  const [processing, setProcessing] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)

  // Subscribe to real-time updates for this swap
  useEffect(() => {
    if (!swapManager || !swapInfo) return

    const unsubscribe = swapManager.subscribeToSwapUpdates(swapInfo.id, (updatedSwap) => {
      setSwapInfo(updatedSwap)
    })

    return unsubscribe
  }, [swapManager, swapInfo?.id])

  if (!swapInfo) return null

  const isReverse = swapInfo.type === 'reverse'

  const refunded = !isReverse && swapInfo.refunded
  const kind = isReverse ? 'Reverse Swap' : 'Submarine Swap'
  const direction = isReverse ? 'Lightning to Arkade' : 'Arkade to Lightning'
  const address = isReverse ? swapInfo.response.lockupAddress : swapInfo.response.address
  const total = isReverse ? swapInfo.request.invoiceAmount : swapInfo.response.expectedAmount
  const invoice = isReverse ? swapInfo.response.invoice : swapInfo.request.invoice
  const decodedInvoice = invoice ? decodeInvoice(invoice) : { amountSats: total, note: '' }
  const amount = isReverse ? swapInfo.response.onchainAmount : decodedInvoice.amountSats

  const formatAmount = (amt: number) => (config.showBalance ? prettyAmount(amt) : prettyHide(amt))

  const data: TableData = [
    ['When', prettyAgo(swapInfo.createdAt)],
    ['Kind', kind],
    ['Swap ID', swapInfo.response.id],
    ['Description', decodedInvoice.note],
    ['Direction', direction],
    ['Date', prettyDate(swapInfo.createdAt)],
    ['Invoice', invoice],
    ['Preimage', swapInfo.preimage],
    ['Address', address],
    ['Status', swapInfo.status],
    ['Amount', formatAmount(amount)],
    ['Fees', formatAmount(total - amount)],
    ['Total', formatAmount(total)],
  ]

  const isRefundable = isSubmarineSwapRefundable(swapInfo)
  const isClaimable = isReverseClaimableStatus(swapInfo.status)
  const buttonLabel = isClaimable ? 'Complete swap' : 'Refund swap'

  const buttonHandler = async () => {
    try {
      setProcessing(true)
      if (isReverse && isClaimable) {
        await claimVHTLC(swapInfo)
        setSuccess(true)
      }
      if (!isReverse && isRefundable) {
        await refundVHTLC(swapInfo)
        setSuccess(true)
      }
      // No need to manually refresh - SwapManager handles status updates
    } catch (error) {
      setError(extractError(error))
      consoleError(error, 'Error processing swap')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <Header text='Swap' back={() => navigate(Pages.AppBoltz)} />
      <Content>
        <Padded>
          {processing ? (
            <Loading text='Processing swap...' />
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
              <Table data={data} />
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
