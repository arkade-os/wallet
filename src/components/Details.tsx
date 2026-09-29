import { useContext, useState } from 'react'
import { prettyBitcoinAmount, prettyBitcoinHide, prettyFiatAmount, prettyFiatHide } from '../lib/format'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import { useTranslation } from '../providers/language'
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
import ServerIcon from '../icons/Server'
import ChevronDownIcon from '../icons/ChevronDown'
import ChevronUpIcon from '../icons/ChevronUp'
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
  getTxIdURL,
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
  claimTxid?: string
  corridor?: string
  recipientGets?: number
  swapFeeSats?: number
  solver?: string
  htlcAddress?: string
  refundDeadline?: string
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
  const { t } = useTranslation()

  const [showAdvanced, setShowAdvanced] = useState(false)

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
    claimTxid,
    corridor,
    recipientGets,
    swapFeeSats,
    solver,
    htlcAddress,
    refundDeadline,
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
                  ? t('accounts.unverifiedAssetAmount')
                  : t('accounts.assetAmount')
                : amount.unverified
                  ? t('accounts.assetAmountTickerUnverified', { ticker: amount.ticker })
                  : t('accounts.assetAmountTicker', { ticker: amount.ticker }),
              formatSensitiveDetail(amount),
              <AmountIcon key={`asset-amount-icon-${amount.assetId ?? amount.ticker}`} />,
            ] satisfies TableData[number],
        ),
        ...(amountDisplay.configured
          ? [
              [
                t('common.value'),
                formatSensitiveDetail(amountDisplay.configured),
                <TotalIcon key='value-icon' />,
              ] satisfies TableData[number],
            ]
          : []),
      ]
    : [[t('common.amount'), formatAmount(satoshis), <AmountIcon key='amount-icon' />]]

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
  // A real Bitcoin tx, so the block explorer — not Arkade's vmempool one.
  const onchainTxOnClick = (id?: string) =>
    wallet && id && getTxIdURL(id, wallet) ? () => openInNewTab(id, wallet) : undefined

  const offchainTxOnClick = (id?: string) =>
    wallet && id && getOffchainTxURL(id, wallet) ? () => openOffchainTxInNewTab(id, wallet) : undefined

  const assetIdOnClick = (id: string) =>
    wallet && getAssetURL(id, wallet)
      ? () => {
          openAssetInNewTab(id, wallet)
        }
      : undefined
  const assetIdRows: TableData = (assetIds ?? (assetId ? [{ assetId, label: t('accounts.assetId') }] : [])).map(
    ({ assetId: id, label }) => [label, id, <InfoIcon key={`${label}-${id}`} />, assetIdOnClick(id)],
  )
  const assetTotalRows: TableData = (assetTotals ?? []).map(({ label, ...amount }) => [
    label,
    formatSensitiveDetail(amount),
    <TotalIcon key={`${label}-${amount.value}`} />,
  ])

  const data: TableData = [
    [t('accounts.swapFrom'), formatSensitiveDetail(swapFrom), <ArrowUpDownIcon key='swap-from-icon' />],
    [t('accounts.swapTo'), formatSensitiveDetail(swapTo), <ArrowUpDownIcon key='swap-to-icon' />],
    [t('accounts.address'), address, <TypeIcon key='address-icon' />],
    [t('accounts.arknote'), arknote, <NotesIcon key='notes-icon' small />],
    [t('accounts.invoice'), invoice, <TypeIcon key='invoice-icon' />],
    [t('accounts.destination'), destination, <TypeIcon key='destination-icon' />],
    [t('accounts.funded'), fundedTxid, <HashIcon key='funded-icon' />, offchainTxOnClick(fundedTxid)],
    [spendLabel ?? t('accounts.completed'), spendTxid, <HashIcon key='spend-icon' />, offchainTxOnClick(spendTxid)],
    // Says the recipient was paid; `spendTxid` only proves the solver acted.
    [t('accounts.paidOnchain'), claimTxid, <HashIcon key='claim-icon' />, onchainTxOnClick(claimTxid)],
    [t('accounts.transactionId'), txid, <HashIcon key='txid-icon' />, showTxidLink ? txidOnClick : undefined],
    ...assetIdRows,
    [t('accounts.corridor'), corridor, <DirectionIcon key='corridor-icon' />],
    [t('accounts.solver'), solver, <ServerIcon key='solver-icon' />],
    [t('accounts.direction'), direction, <DirectionIcon key='direction-icon' />],
    [t('accounts.type'), type, <TypeIcon key='type-icon' />],
    [t('accounts.status'), status, <StatusIcon key='status-icon' />],
    [t('accounts.when'), when, <WhenIcon key='when-icon' />],
    [t('accounts.date'), date, <DateIcon key='date-icon' />],
    [t('accounts.expiry'), expiry, <DateIcon key='expiry-icon' />],
    ...amountRows,
    [t('accounts.priceRate'), priceRate, <ArrowUpDownIcon key='price-rate-icon' />],
    [t('accounts.networkFees'), fees === undefined ? undefined : formatAmount(fees), <FeesIcon key='fees-icon' />],
    [
      t('accounts.swapFees'),
      formatSensitiveDetail(swapFees) ?? (swapFeeSats === undefined ? undefined : formatAmount(swapFeeSats)),
      <FeesIcon key='swap-fees-icon' />,
    ],
    [
      t('accounts.recipientGets'),
      recipientGets === undefined ? undefined : formatAmount(recipientGets),
      <TotalIcon key='recipient-gets-icon' />,
    ],
    ...assetTotalRows,
    [t('accounts.total'), formatAmount(total), <TotalIcon key='total-icon' />],
  ]

  // Gated because they AUDIT a swap, never complete or diagnose one. The gate
  // is local because settings' "Advanced" is a page, not a preference to read.
  const advanced: TableData = [
    [t('accounts.l1HtlcAddress'), htlcAddress, <HashIcon key='htlc-icon' />],
    [t('accounts.refundDeadline'), refundDeadline, <DateIcon key='refund-deadline-icon' />],
  ]
  const hasAdvanced = advanced.some(([, value]) => Boolean(value))

  return (
    <>
      <Table data={data} variant={variant} />
      {hasAdvanced ? (
        <>
          <button type='button' className='details-advanced-toggle' onClick={() => setShowAdvanced((v) => !v)}>
            {t('common.advanced')}
            {showAdvanced ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
          {showAdvanced ? <Table data={advanced} variant={variant} /> : null}
        </>
      ) : null}
    </>
  )
}
