import { useContext } from 'react'
import { prettyAmount, prettyNumber } from '../lib/format'
import { ConfigContext } from '../providers/config'
import Table from './Table'
import { CurrencyDisplay, Fiats } from '../lib/types'
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
  const { toEuro, toUSD } = useContext(FiatContext)

  if (!details) return <></>

  const { address, arknote, comment, fees, invoice, satoshis, total } = details
  const sats = satoshis || 0

  const amount =
    config.currencyDisplay === CurrencyDisplay.Fiat
      ? config.fiat === Fiats.EUR
        ? prettyAmount(toEuro(sats), config.fiat)
        : prettyAmount(toUSD(sats), config.fiat)
      : prettyAmount(sats)

  const table = []

  if (arknote) table.push(['Arknote', arknote])
  if (invoice) table.push(['Invoice', invoice])
  if (address) table.push(['Address', address])
  if (comment) table.push(['Comment', comment])
  if (satoshis) table.push(['Amount', amount])
  if (fees === 0 || fees) table.push(['Network fees', `${prettyNumber(fees)} sats`])
  if (total) table.push(['Total', `${prettyNumber(total)} sats`])

  return <Table data={table} />
}
