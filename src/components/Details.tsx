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
import StatusIcon from '../icons/Status'
import ArrowIcon from '../icons/Arrow'

export interface DetailsProps {
  address?: string
  arknote?: string
  date?: string
  destination?: string
  direction?: string
  expiry?: string
  fees?: number
  invoice?: string
  satoshis?: number
  status?: string
  total?: number
  txid?: string
  type?: string
  when?: string
}

export default function Details({ details }: { details?: DetailsProps }) {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)

  if (!details) return <></>

  const {
    address,
    arknote,
    date,
    direction,
    destination,
    expiry,
    fees,
    invoice,
    satoshis,
    status,
    txid,
    type,
    total,
    when,
  } = details

  const formatAmount = (amount = 0) => {
    const prettyFunc = config.showBalance ? prettyAmount : prettyHide
    return useFiat ? prettyFunc(toFiat(amount), config.fiat) : prettyFunc(amount)
  }

  const table = []

  if (address) table.push(['Address', address, <TypeIcon key='address-icon' />])
  if (arknote) table.push(['Arknote', arknote, <NotesIcon key='notes-icon' small />])
  if (invoice) table.push(['Invoice', invoice, <TypeIcon key='invoice-icon' />])
  if (destination) table.push(['Destination', destination, <TypeIcon key='destination-icon' />])
  if (txid) table.push(['Transaction ID', txid, <ArrowIcon key='txid-icon' />])
  if (direction) table.push(['Direction', direction, <DirectionIcon key='direction-icon' />])
  if (type) table.push(['Type', type, <TypeIcon key='type-icon' />])
  if (status) table.push(['Status', status, <StatusIcon key='status-icon' />])
  if (when) table.push(['When', when, <WhenIcon key='when-icon' />])
  if (date) table.push(['Date', date, <DateIcon key='date-icon' />])
  if (expiry) table.push(['Expiry', expiry, <DateIcon key='expiry-icon' />])
  if (satoshis) table.push(['Amount', formatAmount(satoshis), <AmountIcon key='amount-icon' />])
  if (fees === 0 || fees) table.push(['Network fees', formatAmount(fees), <FeesIcon key='fees-icon' />])
  if (total) table.push(['Total', formatAmount(total), <TotalIcon key='total-icon' />])

  return <Table data={table} />
}
