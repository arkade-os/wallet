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
import Table, { TableData } from './Table'
import StatusIcon from '../icons/Status'
import ArrowIcon from '../icons/Arrow'
import InfoIcon from '../icons/Info'

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
  swapId?: string
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
    swapId,
    txid,
    type,
    total,
    when,
  } = details

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return ''
    if (config.showBalance) {
      return useFiat ? prettyAmount(toFiat(amount), undefined, config.fiat) : prettyAmount(amount, config)
    } else {
      return useFiat ? prettyHide(toFiat(amount), undefined, config.fiat) : prettyHide(amount, config)
    }
  }

  const data: TableData = [
    ['Address', address, <TypeIcon key='address-icon' />],
    ['Arknote', arknote, <NotesIcon key='notes-icon' small />],
    ['Invoice', invoice, <TypeIcon key='invoice-icon' />],
    ['Swap ID', swapId, <InfoIcon key='swap-id-icon' />],
    ['Destination', destination, <TypeIcon key='destination-icon' />],
    ['Transaction ID', txid, <ArrowIcon key='txid-icon' />],
    ['Direction', direction, <DirectionIcon key='direction-icon' />],
    ['Type', type, <TypeIcon key='type-icon' />],
    ['Status', status, <StatusIcon key='status-icon' />],
    ['When', when, <WhenIcon key='when-icon' />],
    ['Date', date, <DateIcon key='date-icon' />],
    ['Expiry', expiry, <DateIcon key='expiry-icon' />],
    ['Amount', formatAmount(satoshis), <AmountIcon key='amount-icon' />],
    ['Network fees', formatAmount(fees), <FeesIcon key='fees-icon' />],
    ['Total', formatAmount(total), <TotalIcon key='total-icon' />],
  ]

  return <Table data={data} />
}
