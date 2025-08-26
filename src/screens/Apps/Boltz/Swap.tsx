import { useContext } from 'react'
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

export default function AppBoltzSwap() {
  const { config } = useContext(ConfigContext)
  const { swapInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

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

  return (
    <>
      <Header text='Swap' back={() => navigate(Pages.AppBoltz)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <Table data={data} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
