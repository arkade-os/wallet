import Content from '../../components/Content'
import Header from '../../components/Header'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'

export default function Activity() {
  return (
    <Content>
      <Padded>
        <Header back text='Activity' />
        <TransactionsList />
      </Padded>
    </Content>
  )
}
