import { useVirtualizer } from '@tanstack/react-virtual'
import { useContext, useRef } from 'react'
import { WalletContext } from '../providers/wallet'
import { Currencies, Tx } from '../lib/types'
import { isBurn, isIssuance, prettyDate } from '../lib/format'
import AssetAvatar from './AssetAvatar'
import ReceivedIcon from '../icons/Received'
import SentIcon from '../icons/Sent'
import FlexRow from './FlexRow'
import { FlowContext } from '../providers/flow'
import { NavigationContext, Pages } from '../providers/navigation'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'
import PreconfirmedIcon from '../icons/Preconfirmed'
import Focusable from './Focusable'
import { hapticSubtle } from '../lib/haptics'
import TokenLogo, { tokenLogoTickerForTicker, trustedAssetTickers } from './TokenLogo'
import { PrivacyAmount } from './PrivacyAmount'
import SwapRouteIcon from './SwapRouteIcon'
import { swapRouteLabel, swapStatusForTx, swapStatusLabel, swapUnitOfAccountAmount } from '../lib/swapDisplay'
import { AspContext } from '../providers/asp'
import UnverifiedBadge from './UnverifiedBadge'
import { buildTransactionAmountDisplay } from '../lib/transactionAmountDisplay'
import { defaultFee } from '../lib/constants'

const border = '1px solid color-mix(in srgb, var(--fg) 6%, transparent)'

const TransactionLine = ({
  tx,
  onClick,
  isFirst,
  mode,
}: {
  tx: Tx
  onClick: () => void
  isFirst?: boolean
  mode: 'virtual' | 'static'
}) => {
  const { config } = useContext(ConfigContext)
  const { fromFiatAmount, toFiatAmount } = useContext(FiatContext)
  const { assetMetadataCache, isVerifiedAsset } = useContext(WalletContext)
  const { aspInfo } = useContext(AspContext)

  const date = tx.createdAt ? prettyDate(tx.createdAt) : tx.boardingTxid ? 'Unconfirmed' : 'Unknown'
  const swap = tx.type === 'swap'
  const swapStatus = swap ? swapStatusForTx(tx) : undefined
  const issuance = isIssuance(tx)
  const burn = isBurn(tx)
  const prefix = issuance ? '+' : burn || tx.type === 'sent' ? '-' : '+'
  const transferSatoshis = tx.assets?.length ? 0 : tx.type === 'sent' ? Math.max(tx.amount - defaultFee, 0) : tx.amount
  const amountDisplay = swap
    ? undefined
    : buildTransactionAmountDisplay({
        assets: tx.assets,
        bitcoinUnit: config.unit,
        currency: config.currency,
        fromFiatAmount,
        isVerifiedAsset,
        metadataForAsset: (assetId) => assetMetadataCache.get(assetId)?.metadata,
        network: aspInfo.network,
        satoshis: transferSatoshis,
        toFiatAmount,
      })

  const iconTone =
    tx.preconfirmed && tx.boardingTxid
      ? 'pending'
      : burn || swapStatus === 'failed' || swapStatus === 'cancelled'
        ? 'burn'
        : swapStatus === 'pending'
          ? 'pending'
          : 'default'
  const Icon = () => {
    const icon = swap ? (
      <SwapRouteIcon
        from={{
          assetId: tx.assetSwap?.fromAssetId,
          icon: tx.assetSwap?.fromAssetId
            ? assetMetadataCache.get(tx.assetSwap.fromAssetId)?.metadata?.icon
            : undefined,
          ticker: tx.assetSwap?.fromTicker,
        }}
        to={{
          assetId: tx.assetSwap?.toAssetId,
          icon: tx.assetSwap?.toAssetId ? assetMetadataCache.get(tx.assetSwap.toAssetId)?.metadata?.icon : undefined,
          ticker: tx.assetSwap?.toTicker,
        }}
      />
    ) : issuance ? (
      <ReceivedIcon />
    ) : burn ? (
      <SentIcon />
    ) : tx.type === 'sent' ? (
      <SentIcon />
    ) : tx.preconfirmed && tx.boardingTxid ? (
      <PreconfirmedIcon />
    ) : (
      <ReceivedIcon dotted={tx.preconfirmed} />
    )
    return <span className={`activity-row__icon activity-row__icon--${iconTone}`}>{icon}</span>
  }

  const kind = swap
    ? swapStatus === 'pending'
      ? 'Swap pending'
      : swapStatus === 'failed'
        ? 'Swap failed'
        : swapStatus === 'cancelled'
          ? 'Swap cancelled'
          : swapStatus === 'recoverable'
            ? 'Swap recoverable'
            : 'Swap'
    : issuance
      ? 'Issuance'
      : burn
        ? 'Burn'
        : tx.type === 'sent'
          ? 'Sent'
          : 'Received'
  const Kind = () => <span className='activity-row__kind'>{kind}</span>

  const swapRoute = swap ? swapRouteLabel(tx) : ''
  const When = () => <span className='activity-row__meta'>{swapRoute ? `${swapRoute} · ${date}` : date}</span>

  const RawAmounts = () => {
    const configured = amountDisplay?.configured
    const rawToRender = configured
      ? amountDisplay.raw.filter((amount) => amount.assetId || amount.value !== configured.value)
      : amountDisplay?.raw.slice(1)
    if (!rawToRender?.length) return null

    return (
      <>
        {rawToRender.map((amount) => {
          const meta = amount.assetId ? assetMetadataCache.get(amount.assetId)?.metadata : undefined
          const { trustedTicker } = trustedAssetTickers(amount.ticker, amount.trusted === true)
          return (
            <FlexRow key={amount.assetId ?? amount.ticker} gap='0.375rem' end>
              {amount.assetId ? (
                <TransactionAssetAvatar
                  icon={meta?.icon}
                  ticker={amount.ticker}
                  trustedTicker={trustedTicker}
                  assetId={amount.assetId}
                />
              ) : null}
              <span className='activity-row__amount activity-row__amount--secondary'>
                <PrivacyAmount masked={`${prefix} ${amount.masked}`}>{`${prefix} ${amount.value}`}</PrivacyAmount>
                {amount.assetId && !amount.trusted ? <UnverifiedBadge /> : null}
              </span>
            </FlexRow>
          )
        })}
      </>
    )
  }

  const Left = () => (
    <div className='activity-row__left'>
      <Icon />
      <div className='activity-row__copy'>
        <Kind />
        <When />
      </div>
    </div>
  )

  const Right = () => (
    <div className='activity-row__right'>
      {swap ? (
        <SwapAmountInfo
          configFiat={config.currency}
          fromFiatAmount={fromFiatAmount}
          toFiatAmount={toFiatAmount}
          tx={tx}
        />
      ) : amountDisplay && (amountDisplay.configured ?? amountDisplay.raw[0]) ? (
        <>
          <span
            className={`activity-row__amount${tx.preconfirmed && tx.boardingTxid ? ' activity-row__amount--pending' : ''}`}
          >
            <PrivacyAmount masked={`${prefix} ${(amountDisplay.configured ?? amountDisplay.raw[0]).masked}`}>
              {`${prefix} ${(amountDisplay.configured ?? amountDisplay.raw[0]).value}`}
            </PrivacyAmount>
            {!amountDisplay.configured && amountDisplay.raw[0]?.assetId && !amountDisplay.raw[0].trusted ? (
              <UnverifiedBadge />
            ) : null}
          </span>
          <RawAmounts />
        </>
      ) : null}
    </div>
  )

  return (
    <div
      className={`activity-row ${isFirst ? 'activity-row--first' : ''} activity-row--${mode}`}
      style={{ borderTop: isFirst ? 'none' : border }}
      onClick={onClick}
    >
      <Left />
      <Right />
    </div>
  )
}

function SwapAmountInfo({
  configFiat,
  fromFiatAmount,
  toFiatAmount,
  tx,
}: {
  configFiat: Currencies
  fromFiatAmount: (amount: number, currency: Currencies) => number
  toFiatAmount: (satoshis: number, currency: Currencies) => number
  tx: Tx
}) {
  const status = swapStatusForTx(tx)
  const amount = swapUnitOfAccountAmount({
    currency: configFiat,
    fromFiatAmount,
    toFiatAmount,
    tx,
  })
  const statusClassName =
    status === 'pending'
      ? ' activity-row__amount--pending'
      : status === 'failed'
        ? ' activity-row__amount--failed'
        : status === 'cancelled'
          ? ' activity-row__amount--cancelled'
          : ''

  return (
    <span className={`activity-row__amount${statusClassName}`}>
      {amount ? <PrivacyAmount masked={amount.masked}>{amount.value}</PrivacyAmount> : swapStatusLabel(tx)}
    </span>
  )
}

interface TransactionsListProps {
  /** Show only transactions for a specific asset. Use 'btc' for bitcoin-only activity. */
  assetIdFilter?: string | string[]
  /** Show only transactions of this type. */
  typeFilter?: Tx['type']
  /** 'virtual' (default) uses virtualization; 'static' renders a simple list. */
  mode?: 'virtual' | 'static'
  /** Max number of transactions to show (only applies when mode='static'). */
  limit?: number
}

export default function TransactionsList({
  assetIdFilter,
  typeFilter,
  mode = 'virtual',
  limit,
}: TransactionsListProps) {
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { assetMetadataCache, txs: allTxs } = useContext(WalletContext)
  const visibleTxs = allTxs
    .filter((tx) => !shouldHideDevAssetTx(tx, assetMetadataCache))
    .filter((tx) => matchesAssetFilter(tx, assetIdFilter))
    .filter((tx) => !typeFilter || tx.type === typeFilter)
  const txs = mode === 'static' && limit ? visibleTxs.slice(0, limit) : visibleTxs

  const focusedRef = useRef(false)
  const focusedIndexRef = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: txs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    measureElement: (element) => element?.getBoundingClientRect().height,
    overscan: 5,
  })

  const key = (tx: Tx, index: number) => {
    const txKey = [tx.roundTxid, tx.redeemTxid, tx.boardingTxid].filter(Boolean).join('-') || 'tx'
    return `${txKey}-${index}`
  }

  const focusRow = (index: number) => {
    if (index < 0 || index >= txs.length) return
    focusedIndexRef.current = index
    virtualizer.scrollToIndex(index)
    requestAnimationFrame(() => {
      const el = document.getElementById(key(txs[index], index)) as HTMLElement
      if (el) el.focus()
    })
  }

  const focusOnFirstRow = () => {
    if (txs.length === 0) return
    focusedRef.current = true
    focusRow(0)
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedRef.current) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusRow(Math.min(focusedIndexRef.current + 1, txs.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusRow(Math.max(focusedIndexRef.current - 1, 0))
    }
  }

  const focusOnOuterShell = () => {
    focusedRef.current = false
    const outer = document.getElementById('outer') as HTMLElement
    if (outer) outer.focus()
  }

  const ariaLabel = (tx?: Tx) => {
    if (!tx) return 'Pressing Enter enables keyboard navigation of the transaction list'
    return `Transaction ${tx.type} of amount ${tx.amount}. Press Escape to exit keyboard navigation.`
  }

  const handleClick = (tx: Tx) => {
    hapticSubtle()
    setTxInfo(tx)
    navigate(Pages.Transaction)
  }

  // Static mode: render a simple list without virtualization
  if (mode === 'static') {
    return (
      <div className='activity-list activity-list--compact'>
        {txs.map((tx, index) => (
          <Focusable
            key={key(tx, index)}
            id={`tx-static-${key(tx, index)}`}
            onEnter={() => handleClick(tx)}
            ariaLabel={ariaLabel(tx)}
          >
            <TransactionLine onClick={() => handleClick(tx)} tx={tx} isFirst={index === 0} mode={mode} />
          </Focusable>
        ))}
      </div>
    )
  }

  // Virtual mode: use virtualization for performance
  return (
    <Focusable id='outer' onEnter={focusOnFirstRow} ariaLabel={ariaLabel()}>
      <div
        ref={parentRef}
        onKeyDown={handleListKeyDown}
        className='activity-list activity-list--full hide-scrollbar scroll-fade'
        style={{
          borderBottom: border,
          minHeight: '200px',
          overflowY: 'auto',
        }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const tx = txs[virtualItem.index]
            const k = key(tx, virtualItem.index)
            return (
              <div
                key={k}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                data-testid='tx-row'
                onFocus={() => {
                  focusedIndexRef.current = virtualItem.index
                  focusedRef.current = true
                }}
                style={{
                  left: 0,
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualItem.start}px)`,
                  width: '100%',
                }}
              >
                <Focusable
                  id={k}
                  inactive={!focusedRef.current}
                  onEnter={() => handleClick(tx)}
                  onEscape={focusOnOuterShell}
                  ariaLabel={ariaLabel(tx)}
                >
                  <TransactionLine
                    onClick={() => handleClick(tx)}
                    tx={tx}
                    isFirst={virtualItem.index === 0}
                    mode={mode}
                  />
                </Focusable>
              </div>
            )
          })}
        </div>
      </div>
    </Focusable>
  )
}

export function matchesAssetFilter(tx: Tx, assetIdFilter?: string | string[]): boolean {
  if (!assetIdFilter) return true
  if (tx.type === 'swap' && tx.assetSwap) {
    const swapAssetIds = [tx.assetSwap.fromAssetId, tx.assetSwap.toAssetId].filter((assetId): assetId is string =>
      Boolean(assetId),
    )
    if (Array.isArray(assetIdFilter)) return swapAssetIds.some((assetId) => assetIdFilter.includes(assetId))
    return swapAssetIds.includes(assetIdFilter)
  }
  if (Array.isArray(assetIdFilter)) {
    if (!assetIdFilter.length) return false
    return tx.assets?.some((asset) => assetIdFilter.includes(asset.assetId)) ?? false
  }
  if (assetIdFilter === 'btc') return !tx.assets?.length && tx.amount !== 0
  return tx.assets?.some((asset) => asset.assetId === assetIdFilter) ?? false
}

function TransactionAssetAvatar({
  assetId,
  icon,
  ticker,
  trustedTicker,
}: {
  assetId: string
  icon?: string
  ticker?: string
  trustedTicker?: string
}) {
  const tokenLogoTicker = tokenLogoTickerForTicker(trustedTicker)
  if (tokenLogoTicker) {
    return (
      <span className='transaction-asset-logo' aria-hidden='true'>
        <TokenLogo ticker={tokenLogoTicker} />
      </span>
    )
  }

  return <AssetAvatar icon={icon} ticker={ticker} size={16} assetId={assetId} clickable />
}

export function shouldHideDevAssetTx(
  tx: Tx,
  assetMetadataCache: Map<string, { metadata?: { name?: string; ticker?: string } }>,
): boolean {
  if (!import.meta.env.DEV || !tx.assets?.length) return false

  return tx.assets.every((asset) => {
    const meta = assetMetadataCache.get(asset.assetId)?.metadata
    const ticker = meta?.ticker?.trim().toUpperCase()
    const name = meta?.name?.trim().toLowerCase()
    return ticker === 'POP' || name === 'poop' || name === 'hoop'
  })
}
