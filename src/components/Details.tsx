import { useContext } from 'react'
import { prettyAmount } from '../lib/format'
import { ConfigContext } from '../providers/config'
import Table from './Table'
import { FiatContext } from '../providers/fiat'

export interface DetailsProps {
  address?: string
  arknote?: string
  invoice?: string
  comment?: string
  fees?: number
  satoshis?: number
  total?: number
}

export default function Details({ details }: { details?: DetailsProps }) {
  const { config } = useContext(ConfigContext)
  const { toUSD } = useContext(FiatContext)

  if (!details) return <></>

  const { address, arknote, comment, fees, invoice, satoshis, total } = details

  const table = []

  if (arknote) table.push(['Arknote', arknote])
  if (invoice) table.push(['Invoice', invoice])
  if (address) table.push(['Address', address])
  if (comment) table.push(['Comment', comment])
  if (satoshis) table.push(['Amount', prettyAmount(satoshis, true, config.showFiat, toUSD)])
  if (fees === 0 || fees) table.push(['Network fees', prettyAmount(fees, true, config.showFiat, toUSD)])
  if (total) table.push(['Total', prettyAmount(total, true, config.showFiat, toUSD)])

  return <Table data={table} />
}
