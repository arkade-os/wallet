import { ReactNode, useContext, useState } from 'react'
import { WalletContext } from '../providers/wallet'
import Text, { TextLabel, TextSecondary } from './Text'
import { CurrencyDisplay, Tx } from '../lib/types'
import { prettyAmount, prettyDate, prettyHide } from '../lib/format'
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

  const prefix = tx.type === 'sent' ? '-' : '+'
  const amount = `${prefix} ${config.showBalance ? prettyAmount(tx.amount) : prettyHide(tx.amount)}`
  const date = tx.createdAt ? prettyDate(tx.createdAt) : tx.boardingTxid ? 'Unconfirmed' : 'Unknown'

  const Fiat = () => {
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
    tx.type === 'sent' ? (
      <SentIcon />
    ) : tx.preconfirmed && tx.boardingTxid ? (
      <PreconfirmedIcon />
    ) : (
      <ReceivedIcon dotted={tx.preconfirmed} />
    )

  const Kind = () => <Text thin>{tx.type === 'sent' ? 'Sent' : 'Received'}</Text>

  const When = () => <TextSecondary>{date}</TextSecondary>

  const Sats = () => (
    <Text color={tx.type === 'received' ? (tx.preconfirmed && tx.boardingTxid ? 'orange' : 'green') : ''} thin>
      {amount}
    </Text>
  )

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

const PassthroughWrapper = ({ children }: { children: ReactNode }) => <>{children}</>

interface TransactionsListProps {
  ItemWrapper?: React.ComponentType<{ children: ReactNode }>
}

export default function TransactionsList({ ItemWrapper }: TransactionsListProps) {
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { txs } = useContext(WalletContext)

  const [focused, setFocused] = useState(false)

  const key = (tx: Tx, index: number) => tx.roundTxid || tx.redeemTxid || tx.boardingTxid || `tx-${index}`

  const focusOnFirstRow = () => {
    setFocused(true)
    if (txs.length === 0) return
    const id = key(txs[0], 0)
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

  const Wrap = ItemWrapper ?? PassthroughWrapper

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <Wrap>
        <TextLabel>Transaction history</TextLabel>
      </Wrap>
      <Focusable id='outer' onEnter={focusOnFirstRow} ariaLabel={ariaLabel()}>
        <div style={{ borderBottom: border }}>
          {txs.map((tx, index) => {
            const k = key(tx, index)
            const focusable = (
              <Focusable
                id={k}
                key={k}
                inactive={!focused}
                onEnter={() => handleClick(tx)}
                onEscape={focusOnOuterShell}
                ariaLabel={ariaLabel(tx)}
              >
                <TransactionLine onClick={() => handleClick(tx)} tx={tx} />
              </Focusable>
            )
            return ItemWrapper ? <ItemWrapper key={k}>{focusable}</ItemWrapper> : focusable
          })}
        </div>
      </Focusable>
    </div>
  )
}
