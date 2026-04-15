import Header from '../../components/Header'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'
import { useContext } from 'react'
import { WalletContext } from '../../providers/wallet'
import { EmptyTxList } from '../../components/Empty'

export default function Activity() {
  const { txs } = useContext(WalletContext)

  return (
    <>
      <Header back text='Activity' />
      <Content>
        <Padded>
          {txs?.length === 0 ? (
            <div style={{ marginTop: '5rem', width: '100%' }}>
              <EmptyTxList />
            </div>
          ) : (
            <TransactionsList />
          )}
        </Padded>
      </Content>
    </>
  )
}
