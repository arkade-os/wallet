import { useContext } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Table from '../../../components/Table'
import { FlowContext } from '../../../providers/flow'
import { decodeInvoice } from '../../../lib/bolt11'
import { prettyAgo, prettyAmount, prettyDate } from '../../../lib/format'

export default function AppBoltzSwap() {
  const { swapInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  if (!swapInfo) return null

  const kind = 'preimage' in swapInfo ? 'Reverse Swap' : 'Submarine Swap'
  const direction = 'preimage' in swapInfo ? 'Lightning to Arkade' : 'Arkade to Lightning'
  const total = 'preimage' in swapInfo ? swapInfo.request.invoiceAmount : swapInfo.response.expectedAmount
  const amount =
    'preimage' in swapInfo ? swapInfo.response.onchainAmount : decodeInvoice(swapInfo.request.invoice).amountSats
  const invoice = 'preimage' in swapInfo ? swapInfo.response.invoice : swapInfo.request.invoice

  const data = [
    ['When', prettyAgo(swapInfo.createdAt)],
    ['Kind', kind],
    ['Swap ID', swapInfo.response.id],
    ['Direction', direction],
    ['Date', prettyDate(swapInfo.createdAt)],
    ['Invoice', invoice],
    ['Status', swapInfo.status],
    ['Amount', prettyAmount(amount)],
    ['Fees', prettyAmount(total - amount)],
    ['Total', prettyAmount(total)],
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
