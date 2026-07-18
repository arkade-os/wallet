import { useContext } from 'react'
import { prettyBitcoinAmount, prettyBitcoinHide, prettyFiatAmount, prettyFiatHide } from '../lib/format'
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
import HashIcon from '../icons/Hash'
import InfoIcon from '../icons/Info'
import ArrowUpDownIcon from '../icons/ArrowUpDown'
import { Wallet } from '../lib/types'
import { SwapDisplayAmount } from '../lib/swapDisplay'
import {
  openInNewTab,
  openOffchainTxInNewTab,
  openAssetInNewTab,
  getOffchainTxURL,
  getAssetURL,
} from '../lib/explorers'

export interface DetailsProps {
  address?: string
  arknote?: string
  assetId?: string
  date?: string
  destination?: string
  direction?: string
  expiry?: string
  fees?: number
  feesLabel?: string
  fundedTxid?: string
  invoice?: string
  isOffchainTx?: boolean
  priceRate?: string
  satoshis?: number
  spendLabel?: string
  spendTxid?: string
  status?: string
  swapFees?: string
  swapFrom?: SwapDisplayAmount
  swapId?: string
  swapTo?: SwapDisplayAmount
  total?: number
  txid?: string
  txidLabel?: string
  type?: string
  wallet?: Wallet
  when?: string
}

export default function Details({ details, variant }: { details?: DetailsProps; variant?: 'default' | 'receipt' }) {
  const { config, useFiat } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)

  if (!details) return <></>

  const {
    address,
    arknote,
    assetId,
    date,
    direction,
    destination,
    expiry,
    fees,
    feesLabel,
    fundedTxid,
    invoice,
    isOffchainTx,
    priceRate,
    satoshis,
    spendLabel,
    spendTxid,
    status,
    swapFees,
    swapFrom,
    swapId,
    swapTo,
    txid,
    txidLabel,
    type,
    total,
    wallet,
    when,
  } = details

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return ''
    if (useFiat) {
      const fiat = toFiat(amount)
      return config.showBalance
        ? prettyFiatAmount(fiat, config.currency, { bitcoinUnit: config.unit })
        : prettyFiatHide(fiat, config.currency, { bitcoinUnit: config.unit })
    }
    return config.showBalance ? prettyBitcoinAmount(amount, config.unit) : prettyBitcoinHide(amount, config.unit)
  }

  const formatSensitiveDetail = (detail?: SwapDisplayAmount) => {
    if (!detail) return undefined
    return config.showBalance ? detail.value : detail.masked
  }

  // Only show explorer link if URL is available (e.g., mainnet for vmempool)
  const txidOnClick =
    wallet && txid
      ? () => {
          if (isOffchainTx) {
            openOffchainTxInNewTab(txid, wallet)
          } else {
            openInNewTab(txid, wallet)
          }
        }
      : undefined

  // Hide offchain tx link if vmempool URL not configured for this network
  const showTxidLink = txidOnClick && (!isOffchainTx || getOffchainTxURL(txid ?? '', wallet!))

  // Swap legs are Arkade virtual transactions, so always link to the arkade explorer
  const offchainTxOnClick = (id?: string) =>
    wallet && id && getOffchainTxURL(id, wallet) ? () => openOffchainTxInNewTab(id, wallet) : undefined

  const assetIdOnClick =
    wallet && assetId && getAssetURL(assetId, wallet)
      ? () => {
          openAssetInNewTab(assetId, wallet)
        }
      : undefined

  const data: TableData = [
    ['From', formatSensitiveDetail(swapFrom), <ArrowUpDownIcon key='swap-from-icon' />],
    ['To', formatSensitiveDetail(swapTo), <ArrowUpDownIcon key='swap-to-icon' />],
    ['Address', address, <TypeIcon key='address-icon' />],
    ['Arknote', arknote, <NotesIcon key='notes-icon' small />],
    ['Invoice', invoice, <TypeIcon key='invoice-icon' />],
    ['Swap ID', swapId, <InfoIcon key='swap-id-icon' />],
    ['Destination', destination, <TypeIcon key='destination-icon' />],
    ['Funded', fundedTxid, <HashIcon key='funded-icon' />, offchainTxOnClick(fundedTxid)],
    [spendLabel ?? 'Completed', spendTxid, <HashIcon key='spend-icon' />, offchainTxOnClick(spendTxid)],
    ['Transaction ID', txid || txidLabel, <HashIcon key='txid-icon' />, showTxidLink ? txidOnClick : undefined],
    ['Asset ID', assetId, <InfoIcon key='asset-id-icon' />, assetIdOnClick],
    ['Direction', direction, <DirectionIcon key='direction-icon' />],
    ['Type', type, <TypeIcon key='type-icon' />],
    ['Status', status, <StatusIcon key='status-icon' />],
    ['When', when, <WhenIcon key='when-icon' />],
    ['Date', date, <DateIcon key='date-icon' />],
    ['Expiry', expiry, <DateIcon key='expiry-icon' />],
    ['Amount', formatAmount(satoshis), <AmountIcon key='amount-icon' />],
    ['Price rate', priceRate, <ArrowUpDownIcon key='price-rate-icon' />],
    ['Network fees', fees === undefined ? feesLabel : formatAmount(fees), <FeesIcon key='fees-icon' />],
    ['Swap fees', swapFees, <FeesIcon key='swap-fees-icon' />],
    ['Total', formatAmount(total), <TotalIcon key='total-icon' />],
  ]

  return <Table data={data} variant={variant} />
}
