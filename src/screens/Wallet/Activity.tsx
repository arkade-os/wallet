import { useContext } from 'react'
import Content from '../../components/Content'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { EmptyTxList } from '../../components/Empty'

export default function Activity() {
  const { txs } = useContext(WalletContext)

  return (
    <>
      <Header text='Activity' back />
      <Content>
        <Padded>{!txs || txs.length === 0 ? <EmptyTxList /> : <TransactionsList />}</Padded>
      </Content>
    </>
  )
}
