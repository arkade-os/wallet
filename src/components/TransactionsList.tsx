import { useVirtualizer } from '@tanstack/react-virtual'
import { useContext, useRef } from 'react'
import { WalletContext } from '../providers/wallet'
import Text, { TextLabel, TextSecondary } from './Text'
import { Tx } from '../lib/types'
import { formatAssetAmount, isBurn, isIssuance, prettyAmount, prettyDate, prettyHide } from '../lib/format'
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

const border = '1px solid var(--dark20)'

const TransactionLine = ({ tx, onClick }: { tx: Tx; onClick: () => void }) => {
  const { config } = useContext(ConfigContext)
  const { toFiat, fiatDecimals } = useContext(FiatContext)
  const { assetMetadataCache } = useContext(WalletContext)

  const prefix = tx.type === 'sent' ? '-' : '+'
  const amount = `${prefix} ${config.showBalance ? prettyAmount(tx.amount) : prettyHide(tx.amount)}`
  const date = tx.createdAt ? prettyDate(tx.createdAt) : tx.boardingTxid ? 'Unconfirmed' : 'Unknown'
  const issuance = isIssuance(tx)
  const burn = isBurn(tx)

  const Fiat = () => {
    if (issuance || burn) return null
    // Fiat is always the secondary line (dark50, small) paired with the primary sats amount.
    const value = toFiat(tx.amount)
    const world = config.showBalance ? prettyAmount(value, config.fiat, fiatDecimals()) : prettyHide(value, config.fiat)
    return (
      <Text color='dark50' small>
        {world}
      </Text>
    )
  }

  const Icon = () =>
    issuance ? (
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

  const Kind = () => (
    <Text thin>{issuance ? 'Issuance' : burn ? 'Burn' : tx.type === 'sent' ? 'Sent' : 'Received'}</Text>
  )

  const When = () => <TextSecondary>{date}</TextSecondary>

  const Sats = () =>
    issuance || burn ? null : (
      <Text color={tx.type === 'received' ? (tx.preconfirmed && tx.boardingTxid ? 'orange' : 'green') : ''} thin>
        {amount}
      </Text>
    )

  const AssetInfo = () => {
    if (!tx.assets?.length) return null
    const color = tx.type === 'received' || issuance ? 'green' : ''
    return (
      <>
        {tx.assets.map((a) => {
          const meta = assetMetadataCache.get(a.assetId)?.metadata
          const ticker = meta?.ticker
          const icon = meta?.icon
          const decimals = meta?.decimals ?? 8
          return (
            <FlexRow key={a.assetId} gap='0.25rem' end>
              <Text color={color} smaller>
                {config.showBalance
                  ? `${formatAssetAmount(a.amount, decimals)} ${ticker ?? meta?.name ?? `${a.assetId.slice(0, 8)}...`}`
                  : prettyHide(a.amount, ticker ?? meta?.name ?? `${a.assetId.slice(0, 8)}...`)}
              </Text>
              <AssetAvatar icon={icon} ticker={ticker} size={16} assetId={a.assetId} clickable />
            </FlexRow>
          )
        })}
      </>
    )
  }

  const rowStyle = {
    alignItems: 'center',
    borderTop: border,
    cursor: 'pointer',
    padding: '0.5rem 0',
  }

  const Left = () => (
    <FlexRow>
      <Icon />
      <div>
        <Kind />
        <When />
      </div>
    </FlexRow>
  )

  const Right = () => (
    <div style={{ textAlign: 'right' }}>
      <Sats />
      <Fiat />
      <AssetInfo />
    </div>
  )

  return (
    <div style={rowStyle} onClick={onClick}>
      <FlexRow>
        <Left />
        <Right />
      </FlexRow>
    </div>
  )
}

interface TransactionsListProps {
  title?: string
  limit?: number
  mode?: 'viewport' | 'static'
}

export default function TransactionsList({
  title = 'Transaction history',
  limit,
  mode = 'viewport',
}: TransactionsListProps = {}) {
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { txs } = useContext(WalletContext)

  const focusedRef = useRef(false)
  const focusedIndexRef = useRef(0)
  const parentRef = useRef<HTMLDivElement>(null)

  const visibleTxs = limit ? txs.slice(0, limit) : txs

  const virtualizer = useVirtualizer({
    count: visibleTxs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 61,
    overscan: 5,
  })

  const key = (tx: Tx, index: number) =>
    [tx.roundTxid, tx.redeemTxid, tx.boardingTxid].filter(Boolean).join('-') || `tx-${index}`

  const focusRow = (index: number) => {
    if (index < 0 || index >= visibleTxs.length) return
    focusedIndexRef.current = index
    virtualizer.scrollToIndex(index)
    requestAnimationFrame(() => {
      const el = document.getElementById(key(visibleTxs[index], index)) as HTMLElement
      if (el) el.focus()
    })
  }

  const focusOnFirstRow = () => {
    if (visibleTxs.length === 0) return
    focusedRef.current = true
    focusRow(0)
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedRef.current) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusRow(Math.min(focusedIndexRef.current + 1, visibleTxs.length - 1))
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

  // Static mode: no virtualization, no fixed height, no keyboard shell. For home "recent N" usage.
  if (mode === 'static') {
    return (
      <>
        {title ? <TextLabel>{title}</TextLabel> : null}
        <div data-testid='tx-list-static'>
          {visibleTxs.map((tx, index) => (
            <div key={key(tx, index)} data-testid='tx-row'>
              <TransactionLine tx={tx} onClick={() => handleClick(tx)} />
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <TextLabel>{title}</TextLabel>
      <Focusable id='outer' onEnter={focusOnFirstRow} ariaLabel={ariaLabel()}>
        <div
          ref={parentRef}
          onKeyDown={handleListKeyDown}
          className='hide-scrollbar scroll-fade'
          style={{
            borderBottom: border,
            height: 'calc(100dvh - 380px)',
            minHeight: '200px',
            overflowY: 'auto',
          }}
        >
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const tx = visibleTxs[virtualItem.index]
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
                    <TransactionLine onClick={() => handleClick(tx)} tx={tx} />
                  </Focusable>
                </div>
              )
            })}
          </div>
        </div>
      </Focusable>
    </>
  )
}
