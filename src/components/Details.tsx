import { useContext } from 'react'
import { prettyAmount, prettyHide } from '../lib/format'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import FeesIcon from '../icons/Fees'
import AmountIcon from '../icons/Amount'
import TotalIcon from '../icons/Total'
import DateIcon from '../icons/Date'
import DirectionIcon from '../icons/Direction'
import TypeIcon from '../icons/Type'
import WhenIcon from '../icons/When'
import NotesIcon from '../icons/Notes'
import Table from './Table'

export interface DetailsProps {
  address?: string
  arknote?: string
  date?: string
  direction?: string
  fees?: number
  invoice?: string
  satoshis?: number
  total?: number
  type?: string
  when?: string
}

export default function Details({ details }: { details?: DetailsProps }) {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)

  if (!details) return <></>

  const { address, arknote, date, direction, fees, invoice, satoshis, type, total, when } = details

  const formatAmount = (amount = 0) => {
    const prettyFunc = config.showBalance ? prettyAmount : prettyHide
    return useFiat ? prettyFunc(toFiat(amount), config.fiat) : prettyFunc(amount)
  }

  const table = []

  if (address) table.push(['Address', address, <TypeIcon />])
  if (arknote) table.push(['Arknote', arknote, <NotesIcon small />])
  if (invoice) table.push(['Invoice', invoice, <TypeIcon />])
  if (direction) table.push(['Direction', direction, <DirectionIcon />])
  if (type) table.push(['Type', type, <TypeIcon />])
  if (when) table.push(['When', when, <WhenIcon />])
  if (date) table.push(['Date', date, <DateIcon />])
  if (satoshis) table.push(['Amount', formatAmount(satoshis), <AmountIcon />])
  if (fees === 0 || fees) table.push(['Network fees', formatAmount(fees), <FeesIcon />])
  if (total) table.push(['Total', formatAmount(total), <TotalIcon />])

  return <Table data={table} />
}
