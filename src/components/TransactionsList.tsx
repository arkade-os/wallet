import { useVirtualizer } from '@tanstack/react-virtual'
import { useContext, useRef } from 'react'
import { WalletContext } from '../providers/wallet'
import { Currencies, Tx, Unit } from '../lib/types'
import {
  isBurn,
  isIssuance,
  prettyCurrencyAssetAmount,
  prettyBitcoinAmount,
  prettyDate,
  prettyFiatAmount,
  prettyFiatHide,
  prettyHide,
} from '../lib/format'
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
import TokenLogo, { accountTickerForAssetTicker, tokenLogoTickerForTicker, type TokenLogoTicker } from './TokenLogo'
import { PrivacyAmount } from './PrivacyAmount'
import SwapRouteIcon from './SwapRouteIcon'
import { swapRouteLabel, swapStatusForTx, swapStatusLabel, swapUnitOfAccountAmount } from '../lib/swapDisplay'
import { fiatAccountAssetSatoshis } from '../lib/accountAssets'

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
  const { fromFiatAmount, toFiat, toFiatAmount } = useContext(FiatContext)
  const { assetMetadataCache } = useContext(WalletContext)

  const prefix = tx.type === 'sent' ? '-' : '+'
  const date = tx.createdAt ? prettyDate(tx.createdAt) : tx.boardingTxid ? 'Unconfirmed' : 'Unknown'
  const asAssets = Boolean(tx.assets?.length)
  const swap = tx.type === 'swap'
  const swapStatus = swap ? swapStatusForTx(tx) : undefined
  const issuance = isIssuance(tx)
  const burn = isBurn(tx)
  const accountAssetValues = tx.assets?.map((asset) => {
    const accountInfo = accountInfoForAssetId(asset.assetId)
    const metadata = assetMetadataCache.get(asset.assetId)?.metadata
    return fiatAccountAssetSatoshis(
      BigInt(asset.amount),
      accountInfo?.decimals ?? metadata?.decimals ?? 8,
      accountInfo?.ticker ?? metadata?.ticker,
      fromFiatAmount,
    )
  })
  const accountValueSatoshis =
    accountAssetValues?.length && accountAssetValues.every((value) => value !== undefined)
      ? accountAssetValues.reduce((total, value) => total + value, 0)
      : undefined

  const Currency = () => {
    if (issuance || burn || swap) return null
    const value = toFiat(accountValueSatoshis ?? tx.amount)
    const statusClassName = tx.boardingTxid && tx.preconfirmed ? ' activity-row__amount--pending' : ''
    const secondaryClassName = asAssets ? ' activity-row__amount--secondary' : ''
    return (
      <span className={`activity-row__amount${statusClassName}${secondaryClassName}`}>
        <PrivacyAmount masked={prettyFiatHide(value, config.currency, { bitcoinUnit: config.unit })}>
          {prettyFiatAmount(value, config.currency, { bitcoinUnit: config.unit })}
        </PrivacyAmount>
      </span>
    )
  }

  const iconTone =
    tx.preconfirmed && tx.boardingTxid
      ? 'pending'
      : burn || swapStatus === 'failed'
        ? 'burn'
        : swapStatus === 'pending'
          ? 'pending'
          : 'default'
  const Icon = () => {
    const icon = swap ? (
      <SwapRouteIcon
        from={{
          assetId: tx.prototypeSwap?.fromAssetId,
          icon: tx.prototypeSwap?.fromAssetId
            ? assetMetadataCache.get(tx.prototypeSwap.fromAssetId)?.metadata?.icon
            : undefined,
          ticker: tx.prototypeSwap?.fromTicker,
        }}
        to={{
          assetId: tx.prototypeSwap?.toAssetId,
          icon: tx.prototypeSwap?.toAssetId
            ? assetMetadataCache.get(tx.prototypeSwap.toAssetId)?.metadata?.icon
            : undefined,
          ticker: tx.prototypeSwap?.toTicker,
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

  const Bitcoin = () =>
    issuance || burn ? null : (
      <span
        className={`activity-row__amount${tx.preconfirmed && tx.boardingTxid ? ' activity-row__amount--pending' : ''}${
          asAssets ? ' activity-row__amount--secondary' : ''
        }`}
      >
        <PrivacyAmount
          masked={`${prefix} ${prettyFiatHide(toFiat(tx.amount), config.currency, { bitcoinUnit: config.unit })}`}
        >{`${prefix} ${prettyBitcoinAmount(tx.amount, config.unit)}`}</PrivacyAmount>
      </span>
    )

  const AssetInfo = () => {
    if (!tx.assets?.length) return null
    return (
      <>
        {tx.assets.map((a) => {
          const accountInfo = accountInfoForAssetId(a.assetId)
          const meta = assetMetadataCache.get(a.assetId)?.metadata
          const ticker = accountInfo?.ticker ?? meta?.ticker
          const icon = meta?.icon
          const decimals = accountInfo?.decimals ?? meta?.decimals ?? 8
          const accountTicker = accountTickerForAssetTicker(ticker)
          const label = accountInfo?.label ?? accountTicker ?? ticker ?? meta?.name ?? `${a.assetId.slice(0, 8)}...`
          return (
            <FlexRow key={a.assetId} gap='0.375rem' end>
              <TransactionAssetAvatar icon={icon} ticker={accountTicker ?? ticker} assetId={a.assetId} />
              <span className='activity-row__amount'>
                <PrivacyAmount masked={prettyHide(a.amount, label)}>
                  {`${prettyCurrencyAssetAmount(a.amount, decimals, accountTicker ?? ticker)} ${label}`}
                </PrivacyAmount>
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
          bitcoinUnit={config.unit}
          configFiat={config.currency}
          fromFiatAmount={fromFiatAmount}
          toFiatAmount={toFiatAmount}
          tx={tx}
        />
      ) : tx.assets?.length ? (
        <>
          <AssetInfo />
          {config.currency === Currencies.BTC && accountValueSatoshis === undefined ? <Bitcoin /> : <Currency />}
        </>
      ) : (
        <>{config.currency === Currencies.BTC ? <Bitcoin /> : <Currency />}</>
      )}
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
  bitcoinUnit,
  configFiat,
  fromFiatAmount,
  toFiatAmount,
  tx,
}: {
  bitcoinUnit: Unit
  configFiat: Currencies
  fromFiatAmount: (amount: number, currency: Currencies) => number
  toFiatAmount: (satoshis: number, currency: Currencies) => number
  tx: Tx
}) {
  const status = swapStatusForTx(tx)
  const amount = swapUnitOfAccountAmount({
    bitcoinUnit,
    currency: configFiat,
    fromFiatAmount,
    toFiatAmount,
    tx,
  })
  const statusClassName =
    status === 'pending' ? ' activity-row__amount--pending' : status === 'failed' ? ' activity-row__amount--failed' : ''

  return (
    <span className={`activity-row__amount${statusClassName}`}>
      {amount ? <PrivacyAmount masked={amount.masked}>{amount.value}</PrivacyAmount> : swapStatusLabel(tx)}
    </span>
  )
}

interface TransactionsListProps {
  /** Show only transactions for a specific asset. Use 'btc' for bitcoin-only activity. */
  assetIdFilter?: string | string[]
  /** 'virtual' (default) uses virtualization; 'static' renders a simple list. */
  mode?: 'virtual' | 'static'
  /** Max number of transactions to show (only applies when mode='static'). */
  limit?: number
}

export default function TransactionsList({ assetIdFilter, mode = 'virtual', limit }: TransactionsListProps) {
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { assetMetadataCache, txs: allTxs } = useContext(WalletContext)
  const visibleTxs = allTxs
    .filter((tx) => !shouldHideDevPrototypeTx(tx, assetMetadataCache))
    .filter((tx) => matchesAssetFilter(tx, assetIdFilter))
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

function matchesAssetFilter(tx: Tx, assetIdFilter?: string | string[]): boolean {
  if (!assetIdFilter) return true
  if (tx.type === 'swap' && tx.prototypeSwap) {
    const swapAssetIds = [tx.prototypeSwap.fromAssetId, tx.prototypeSwap.toAssetId].filter(
      (assetId): assetId is string => Boolean(assetId),
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

function TransactionAssetAvatar({ assetId, icon, ticker }: { assetId: string; icon?: string; ticker?: string }) {
  const tokenLogoTicker = tokenLogoTickerForTicker(accountTickerForAssetTicker(ticker) ?? ticker)
  if (tokenLogoTicker) {
    return (
      <span className='transaction-asset-logo' aria-hidden='true'>
        <TokenLogo ticker={tokenLogoTicker} />
      </span>
    )
  }

  return <AssetAvatar icon={icon} ticker={ticker} size={16} assetId={assetId} clickable />
}

function accountInfoForAssetId(
  assetId: string,
): { ticker: TokenLogoTicker; label: string; decimals: number } | undefined {
  if (assetId === 'account:usd') return { ticker: 'USD', label: 'USD', decimals: 2 }
  if (assetId === 'account:chf') return { ticker: 'CHF', label: 'CHF', decimals: 2 }
  if (assetId === 'account:brl') return { ticker: 'BRL', label: 'BRL', decimals: 2 }
}

function shouldHideDevPrototypeTx(
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
