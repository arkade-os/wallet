import { useVirtualizer } from '@tanstack/react-virtual'
import { useContext, useRef } from 'react'
import { WalletContext } from '../providers/wallet'
import { CurrencyDisplay, Tx } from '../lib/types'
import {
  formatAssetAmount,
  isBurn,
  isIssuance,
  prettyAmount,
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
import TokenLogo, { type TokenLogoTicker } from './TokenLogo'
import { PrivacyAmount } from './PrivacyAmount'

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
  const { toFiat } = useContext(FiatContext)
  const { assetMetadataCache } = useContext(WalletContext)

  const prefix = tx.type === 'sent' ? '-' : '+'
  const date = tx.createdAt ? prettyDate(tx.createdAt) : tx.boardingTxid ? 'Unconfirmed' : 'Unknown'
  const asAssets = Boolean(tx.assets?.length)
  const issuance = isIssuance(tx)
  const burn = isBurn(tx)

  const Fiat = () => {
    if (issuance || burn) return null
    const value = toFiat(tx.amount)
    const statusClassName = tx.boardingTxid && tx.preconfirmed ? ' activity-row__amount--pending' : ''
    const secondaryClassName =
      asAssets || config.currencyDisplay === CurrencyDisplay.Both ? ' activity-row__amount--secondary' : ''
    return (
      <span className={`activity-row__amount${statusClassName}${secondaryClassName}`}>
        <PrivacyAmount masked={prettyFiatHide(value, config.fiat)}>
          {prettyFiatAmount(value, config.fiat)}
        </PrivacyAmount>
      </span>
    )
  }

  const iconTone = tx.preconfirmed && tx.boardingTxid ? 'pending' : burn ? 'burn' : 'default'
  const Icon = () => {
    const icon = issuance ? (
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

  const kind = issuance ? 'Issuance' : burn ? 'Burn' : tx.type === 'sent' ? 'Sent' : 'Received'
  const Kind = () => <span className='activity-row__kind'>{kind}</span>

  const When = () => <span className='activity-row__meta'>{date}</span>

  const Sats = () =>
    issuance || burn ? null : (
      <span
        className={`activity-row__amount${tx.preconfirmed && tx.boardingTxid ? ' activity-row__amount--pending' : ''}${
          asAssets ? ' activity-row__amount--secondary' : ''
        }`}
      >
        <PrivacyAmount
          masked={`${prefix} ${prettyHide(tx.amount)}`}
        >{`${prefix} ${prettyAmount(tx.amount)}`}</PrivacyAmount>
      </span>
    )

  const AssetInfo = () => {
    if (!tx.assets?.length) return null
    return (
      <>
        {tx.assets.map((a) => {
          const meta = assetMetadataCache.get(a.assetId)?.metadata
          const ticker = meta?.ticker
          const icon = meta?.icon
          const decimals = meta?.decimals ?? 8
          return (
            <FlexRow key={a.assetId} gap='0.375rem' end>
              <TransactionAssetAvatar icon={icon} ticker={ticker} assetId={a.assetId} />
              <span className='activity-row__amount'>
                <PrivacyAmount masked={prettyHide(a.amount, ticker ?? meta?.name ?? `${a.assetId.slice(0, 8)}...`)}>
                  {`${formatAssetAmount(a.amount, decimals)} ${ticker ?? meta?.name ?? `${a.assetId.slice(0, 8)}...`}`}
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
      {tx.assets?.length ? (
        <>
          <AssetInfo />
          {config.currencyDisplay === CurrencyDisplay.Fiat ? <Fiat /> : <Sats />}
        </>
      ) : config.currencyDisplay === CurrencyDisplay.Fiat ? (
        <Fiat />
      ) : config.currencyDisplay === CurrencyDisplay.Sats ? (
        <Sats />
      ) : (
        <>
          <Sats />
          <Fiat />
        </>
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

interface TransactionsListProps {
  /** Override the default title. Pass '' to hide it. */
  title?: string
  /** 'virtual' (default) uses virtualization; 'static' renders a simple list. */
  mode?: 'virtual' | 'static'
  /** Max number of transactions to show (only applies when mode='static'). */
  limit?: number
}

export default function TransactionsList({ mode = 'virtual', limit }: TransactionsListProps = {}) {
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { assetMetadataCache, txs: allTxs } = useContext(WalletContext)
  const visibleTxs = allTxs.filter((tx) => !shouldHideDevPrototypeTx(tx, assetMetadataCache))
  const txs = mode === 'static' && limit ? visibleTxs.slice(0, limit) : visibleTxs

  const focusedRef = useRef(false)
  const focusedIndexRef = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: txs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  })

  const key = (tx: Tx, index: number) =>
    [tx.roundTxid, tx.redeemTxid, tx.boardingTxid].filter(Boolean).join('-') || `tx-${index}`

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
          <TransactionLine
            key={key(tx, index)}
            onClick={() => handleClick(tx)}
            tx={tx}
            isFirst={index === 0}
            mode={mode}
          />
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
          height: 'calc(100dvh - 260px)',
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

function TransactionAssetAvatar({ assetId, icon, ticker }: { assetId: string; icon?: string; ticker?: string }) {
  const tokenLogoTicker = getTokenLogoTicker(ticker)
  if (tokenLogoTicker) {
    return (
      <span className='transaction-asset-logo' aria-hidden='true'>
        <TokenLogo ticker={tokenLogoTicker} />
      </span>
    )
  }

  return <AssetAvatar icon={icon} ticker={ticker} size={16} assetId={assetId} clickable />
}

function getTokenLogoTicker(ticker: string | undefined): TokenLogoTicker | undefined {
  const normalized = ticker?.trim().toUpperCase()
  if (normalized === 'BTC' || normalized === 'USDT' || normalized === 'USDC') return normalized
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
    return ticker === 'POP' || name === 'poop' || name === 'hoop' || (ticker === 'CHF' && name === 'swiss franc')
  })
}
