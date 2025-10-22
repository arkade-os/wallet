import { useContext, useState } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Table from '../../../components/Table'
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

export default function AppBoltzSwap() {
  const { config } = useContext(ConfigContext)
  const { swapInfo } = useContext(FlowContext)
  const { swapProvider } = useContext(LightningContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState<string>('')
  const [cooking, setCooking] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)

  if (!swapInfo) return null

  const isReverse = swapInfo.type === 'reverse'

  const kind = isReverse ? 'Reverse Swap' : 'Submarine Swap'
  const total = isReverse ? swapInfo.request.invoiceAmount : swapInfo.response.expectedAmount
  const amount = isReverse ? swapInfo.response.onchainAmount : decodeInvoice(swapInfo.request.invoice).amountSats
  const invoice = isReverse ? swapInfo.response.invoice : swapInfo.request.invoice
  const direction = isReverse ? 'Lightning to Arkade' : 'Arkade to Lightning'

  const formatAmount = (amt: number) => (config.showBalance ? prettyAmount(amt) : prettyHide(amt))

  const data = [
    ['When', prettyAgo(swapInfo.createdAt)],
    ['Kind', kind],
    ['Swap ID', swapInfo.response.id],
    ['Direction', direction],
    ['Date', prettyDate(swapInfo.createdAt)],
    ['Invoice', invoice],
    ['Preimage', swapInfo.preimage],
    ['Status', swapInfo.status],
    ['Amount', formatAmount(amount)],
    ['Fees', formatAmount(total - amount)],
    ['Total', formatAmount(total)],
  ]

  const isRefundable = isSubmarineSwapRefundable(swapInfo)
  const isClaimable = isReverseClaimableStatus(swapInfo.status)
  const buttonLabel = isClaimable ? 'Complete swap' : 'Refund swap'

  const buttonHandler = async () => {
    if (!swapProvider) return
    try {
      setCooking(true)
      if (isReverse && isClaimable) {
        await swapProvider.claimVHTLC(swapInfo)
        setSuccess(true)
      }
      if (!isReverse && isRefundable) {
        await swapProvider.refundVHTLC(swapInfo)
        setSuccess(true)
      }
      await swapProvider.refreshSwapsStatus()
    } catch (error) {
      setError(extractError(error))
      consoleError(error, 'Error processing swap')
    } finally {
      setCooking(false)
    }
  }

  const Buttons = () =>
    !success && (isRefundable || isClaimable) ? (
      <ButtonsOnBottom>
        <Button onClick={buttonHandler} label={buttonLabel} disabled={cooking} />
      </ButtonsOnBottom>
    ) : null

  return (
    <>
      <Header text='Swap' back={() => navigate(Pages.AppBoltz)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <ErrorMessage error={Boolean(error)} text={error} />
            {success ? (
              <Info color='green' icon={<CheckMarkIcon small />} title='Success'>
                <TextSecondary>Swap {isRefundable ? 'refunded' : 'completed'}</TextSecondary>
              </Info>
            ) : null}
            <Table data={data} />
          </FlexCol>
        </Padded>
      </Content>
      <Buttons />
    </>
  )
}
