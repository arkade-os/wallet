import { useContext } from 'react'
import { WalletContext } from '../providers/wallet'
import Text, { TextLabel, TextSecondary } from './Text'
import { Tx } from '../lib/types'
import { prettyAmount, prettyDate, prettyLongText } from '../lib/format'
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
  const { toUSD } = useContext(FiatContext)
  const { setTxInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const amountPrefix = tx.type === 'sent' ? '-' : '+'
  const amountInSats = tx.type === 'sent' ? tx.amount - defaultFee : tx.amount
  const amountToShow = prettyAmount(amountInSats, config.showBalance, config.showFiat, toUSD)
  const amount = `${amountPrefix} ${amountToShow}`
  const txid = tx.explorable ? `(${prettyLongText(tx.explorable, 3)})` : ''

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
  const Kind = () => (tx.type === 'sent' ? <Text>Sent {txid}</Text> : <Text>Received {txid}</Text>)
  const Date = () => <TextSecondary>{prettyDate(tx.createdAt)}</TextSecondary>
  const Sats = () => (tx.type === 'sent' ? <Text>{amount}</Text> : <Text color='green'>{amount}</Text>)
  const Last = () =>
    tx.type === 'sent' ? (
      <Text small>Sent</Text>
    ) : (
      <Text color='green' small>
        Received
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

  return (
    <div style={rowStyle} onClick={handleClick}>
      <FlexRow>
        <FlexRow>
          <Icon />
          <div>
            <Kind />
            <Date />
          </div>
        </FlexRow>
        <div style={{ textAlign: 'right' }}>
          <Sats />
          <Last />
        </div>
      </FlexRow>
    </div>
  )
}

export default function TransactionsList() {
  const { reloadWallet, wallet } = useContext(WalletContext)

  const transactions = wallet.txs

  if (transactions?.length === 0) return <></>

  const key = (tx: Tx) => `${tx.amount}${tx.createdAt}${tx.boardingTxid}${tx.roundTxid}${tx.redeemTxid}${tx.type}`

  return (
    <div style={{ width: 'calc(100% + 2rem)', margin: '0 -1rem' }}>
      <div onClick={reloadWallet} style={{ cursor: 'pointer' }}>
        <TextLabel>Transaction history</TextLabel>
      </div>
      <div style={{ borderBottom: border }}>
        {transactions.map((tx) => (
          <TransactionLine key={key(tx)} tx={tx} />
        ))}
      </div>
    </div>
  )
}
