import { useContext, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import Text, { TextLabel, TextSecondary } from './Text'
import { CurrencyDisplay, Tx } from '../lib/types'
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
  const { toFiat } = useContext(FiatContext)
  const { assetMetadataCache } = useContext(WalletContext)

  const prefix = tx.type === 'sent' ? '-' : '+'
  const amount = `${prefix} ${config.showBalance ? prettyAmount(tx.amount) : prettyHide(tx.amount)}`
  const date = tx.createdAt ? prettyDate(tx.createdAt) : tx.boardingTxid ? 'Unconfirmed' : 'Unknown'
  const issuance = isIssuance(tx)
  const burn = isBurn(tx)

  const Fiat = () => {
    if (issuance || burn) return null
    const color =
      config.currencyDisplay === CurrencyDisplay.Both
        ? 'dark50'
        : tx.type === 'received'
          ? 'green'
          : tx.boardingTxid && tx.preconfirmed
            ? 'orange'
            : ''
    const value = toFiat(tx.amount)
    const small = config.currencyDisplay === CurrencyDisplay.Both
    const world = config.showBalance ? prettyAmount(value, config.fiat) : prettyHide(value, config.fiat)
    return (
      <Text color={color} small={small}>
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
    padding: '0.5rem 1rem',
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
      {config.currencyDisplay === CurrencyDisplay.Fiat ? (
        <Fiat />
      ) : config.currencyDisplay === CurrencyDisplay.Sats ? (
        <Sats />
      ) : (
        <>
          <Sats />
          <Fiat />
        </>
      )}
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

export default function TransactionsList() {
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { txs } = useContext(WalletContext)

  const [focused, setFocused] = useState(false)

  const key = (tx: Tx) => `${tx.amount}${tx.createdAt}${tx.boardingTxid}${tx.roundTxid}${tx.redeemTxid}${tx.type}`

  const focusOnFirstRow = () => {
    setFocused(true)
    if (txs.length === 0) return
    const id = key(txs[0])
    const first = document.getElementById(id) as HTMLElement
    if (first) first.focus()
  }

  const focusOnOuterShell = () => {
    setFocused(false)
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

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <TextLabel>Transaction history</TextLabel>
      <Focusable id='outer' onEnter={focusOnFirstRow} ariaLabel={ariaLabel()}>
        <div style={{ borderBottom: border }}>
          {txs.map((tx) => (
            <Focusable
              id={key(tx)}
              key={key(tx)}
              inactive={!focused}
              onEnter={() => handleClick(tx)}
              onEscape={focusOnOuterShell}
              ariaLabel={ariaLabel(tx)}
            >
              <TransactionLine onClick={() => handleClick(tx)} tx={tx} />
            </Focusable>
          ))}
        </div>
      </Focusable>
    </div>
  )
}
