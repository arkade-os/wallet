import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import Text, { TextLabel, TextSecondary } from './Text'
import { CurrencyDisplay, Tx } from '../lib/types'
import { prettyAmount, prettyDate, prettyHide, prettyLongText, prettyNumber } from '../lib/format'
import PendingIcon from '../icons/Pending'
import ReceivedIcon from '../icons/Received'
import SentIcon from '../icons/Sent'
import FlexRow from './FlexRow'
import { FlowContext } from '../providers/flow'
import { NavigationContext, Pages } from '../providers/navigation'
import { defaultFee } from '../lib/constants'
import SelfSendIcon from '../icons/SelfSend'
import { ConfigContext } from '../providers/config'
import { FiatContext } from '../providers/fiat'

const border = '1px solid var(--dark20)'

const TransactionLine = ({ tx }: { tx: Tx }) => {
  const { config } = useContext(ConfigContext)
  const { toFiat } = useContext(FiatContext)
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const prefix = tx.type === 'sent' ? '-' : '+'
  const amount = `${prefix} ${config.showBalance ? prettyAmount(tx.amount) : prettyHide(tx.amount)}`
  const txid = tx.explorable ? `(${prettyLongText(tx.explorable, 3)})` : ''

  const Fiat = () => {
    const color =
      config.currencyDisplay === CurrencyDisplay.Both
        ? 'dark50'
        : tx.type === 'received'
        ? 'green'
        : tx.pending
        ? 'orange'
        : ''
    const value = toFiat(tx.amount)
    const small = config.currencyDisplay === CurrencyDisplay.Both
    const world = (config.showBalance ? prettyNumber(value, 2) : prettyHide(value)) + ' ' + config.fiat
    return (
      <Text color={color} small={small}>
        {world}
      </Text>
    )
  }
  const Icon = () =>
    !tx.settled ? (
      <PendingIcon />
    ) : tx.type === 'sent' ? (
      tx.amount === defaultFee ? (
        <SelfSendIcon />
      ) : (
        <SentIcon />
      )
    ) : (
      <ReceivedIcon />
    )
  const Kind = () => (
    <Text>
      {tx.type === 'sent' ? 'Sent' : 'Received'} {txid}
    </Text>
  )
  const Date = () => <TextSecondary>{prettyDate(tx.createdAt)}</TextSecondary>
  const Sats = () => <Text color={tx.pending ? 'orange' : tx.type === 'received' ? 'green' : ''}>{amount}</Text>

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
        <Date />
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
    <div style={rowStyle} onClick={handleClick}>
      <FlexRow>
        <Left />
        <Right />
      </FlexRow>
    </div>
  )
}

export default function TransactionsList() {
  const { txs } = useContext(WalletContext)

  if (txs?.length === 0) return <></>

  const key = (tx: Tx) => `${tx.amount}${tx.createdAt}${tx.boardingTxid}${tx.roundTxid}${tx.redeemTxid}${tx.type}`

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <TextLabel>Transaction history</TextLabel>
      <div style={{ borderBottom: border }}>
        {txs.map((tx) => (
          <TransactionLine key={key(tx)} tx={tx} />
        ))}
      </div>
    </div>
  )
}
