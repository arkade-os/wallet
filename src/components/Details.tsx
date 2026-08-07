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
import type { TransactionAmountDisplay } from '../lib/transactionAmountDisplay'
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
  assetIds?: { assetId: string; label: string }[]
  assetTotals?: (SwapDisplayAmount & { label: string })[]
  amountDisplay?: TransactionAmountDisplay
  date?: string
  destination?: string
  direction?: string
  expiry?: string
  fees?: number
  fundedTxid?: string
  invoice?: string
  isOffchainTx?: boolean
  priceRate?: string
  satoshis?: number
  spendLabel?: string
  spendTxid?: string
  status?: string
  swapFees?: SwapDisplayAmount
  swapFrom?: SwapDisplayAmount
  swapTo?: SwapDisplayAmount
  total?: number
  txid?: string
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
    assetIds,
    assetTotals,
    amountDisplay,
    date,
    direction,
    destination,
    expiry,
    fees,
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
    swapTo,
    txid,
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

  const amountRows: TableData = amountDisplay
    ? [
        ...amountDisplay.raw.map(
          (amount) =>
            [
              amountDisplay.raw.length === 1
                ? amount.unverified
                  ? 'Unverified asset amount'
                  : 'Asset amount'
                : `Asset amount (${amount.ticker}${amount.unverified ? ', unverified' : ''})`,
              formatSensitiveDetail(amount),
              <AmountIcon key={`asset-amount-icon-${amount.assetId ?? amount.ticker}`} />,
            ] satisfies TableData[number],
        ),
        ...(amountDisplay.configured
          ? [
              [
                'Value',
                formatSensitiveDetail(amountDisplay.configured),
                <TotalIcon key='value-icon' />,
              ] satisfies TableData[number],
            ]
          : []),
      ]
    : [['Amount', formatAmount(satoshis), <AmountIcon key='amount-icon' />]]

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

  const assetIdOnClick = (id: string) =>
    wallet && getAssetURL(id, wallet)
      ? () => {
          openAssetInNewTab(id, wallet)
        }
      : undefined
  const assetIdRows: TableData = (assetIds ?? (assetId ? [{ assetId, label: 'Asset ID' }] : [])).map(
    ({ assetId: id, label }) => [label, id, <InfoIcon key={`${label}-${id}`} />, assetIdOnClick(id)],
  )
  const assetTotalRows: TableData = (assetTotals ?? []).map(({ label, ...amount }) => [
    label,
    formatSensitiveDetail(amount),
    <TotalIcon key={`${label}-${amount.value}`} />,
  ])

  const data: TableData = [
    ['Swap from', formatSensitiveDetail(swapFrom), <ArrowUpDownIcon key='swap-from-icon' />],
    ['Swap to', formatSensitiveDetail(swapTo), <ArrowUpDownIcon key='swap-to-icon' />],
    ['Address', address, <TypeIcon key='address-icon' />],
    ['Arknote', arknote, <NotesIcon key='notes-icon' small />],
    ['Invoice', invoice, <TypeIcon key='invoice-icon' />],
    ['Destination', destination, <TypeIcon key='destination-icon' />],
    ['Funded', fundedTxid, <HashIcon key='funded-icon' />, offchainTxOnClick(fundedTxid)],
    [spendLabel ?? 'Completed', spendTxid, <HashIcon key='spend-icon' />, offchainTxOnClick(spendTxid)],
    ['Transaction ID', txid, <HashIcon key='txid-icon' />, showTxidLink ? txidOnClick : undefined],
    ...assetIdRows,
    ['Direction', direction, <DirectionIcon key='direction-icon' />],
    ['Type', type, <TypeIcon key='type-icon' />],
    ['Status', status, <StatusIcon key='status-icon' />],
    ['When', when, <WhenIcon key='when-icon' />],
    ['Date', date, <DateIcon key='date-icon' />],
    ['Expiry', expiry, <DateIcon key='expiry-icon' />],
    ...amountRows,
    ['Price rate', priceRate, <ArrowUpDownIcon key='price-rate-icon' />],
    ['Network fees', fees === undefined ? undefined : formatAmount(fees), <FeesIcon key='fees-icon' />],
    ['Swap fees', formatSensitiveDetail(swapFees), <FeesIcon key='swap-fees-icon' />],
    ...assetTotalRows,
    ['Total', formatAmount(total), <TotalIcon key='total-icon' />],
  ]

  return <Table data={data} variant={variant} />
}
