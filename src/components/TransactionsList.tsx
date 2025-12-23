import { useContext, useState } from 'react'
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

const border = '1px solid var(--dark20)'

const TransactionLine = ({ focusable, tx }: { focusable?: boolean; tx: Tx }) => {
  const { config } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

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

  const handleClick = () => {
    setTxInfo(tx)
    navigate(Pages.Transaction)
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
    </div>
  )

  const Line = () => (
    <div style={rowStyle} onClick={handleClick}>
      <FlexRow>
        <Left />
        <Right />
      </FlexRow>
    </div>
  )

  return focusable ? (
    <Focusable onKeyDown={handleClick}>
      <Line />
    </Focusable>
  ) : (
    <Line />
  )
}

export default function TransactionsList() {
  const { txs } = useContext(WalletContext)

  const [focusable, setFocusable] = useState(false)

  const key = (tx: Tx) => `${tx.amount}${tx.createdAt}${tx.boardingTxid}${tx.roundTxid}${tx.redeemTxid}${tx.type}`

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <Focusable onKeyDown={() => setFocusable(true)}>
        <TextLabel>Transaction history</TextLabel>
      </Focusable>
      <div style={{ borderBottom: border }}>
        {txs.map((tx) => (
          <TransactionLine key={key(tx)} focusable={focusable} tx={tx} />
        ))}
      </div>
    </div>
  )
}
