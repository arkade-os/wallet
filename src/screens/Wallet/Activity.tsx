import { useContext, useEffect, useRef, useState } from 'react'
import { EmptyTxList } from '../../components/Empty'
import Content from '../../components/Content'
import Header from '../../components/Header'
import LoadingLogo from '../../components/LoadingLogo'
import Padded from '../../components/Padded'
import TransactionsList from '../../components/TransactionsList'
import { WalletContext } from '../../providers/wallet'
import { consoleError } from '../../lib/logs'

export default function Activity() {
  const { reloadWallet, svcWallet, txs } = useContext(WalletContext)
  const [refreshing, setRefreshing] = useState(false)
  const refreshAttempted = useRef(false)

  useEffect(() => {
    if (txs.length > 0 || !svcWallet) return
    if (refreshAttempted.current) return

    let cancelled = false
    refreshAttempted.current = true
    setRefreshing(true)
    svcWallet
      .reload()
      .then(() => reloadWallet(svcWallet))
      .catch((err) => consoleError(err, 'Error refreshing activity'))
      .finally(() => {
        if (!cancelled) setRefreshing(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadWallet, svcWallet, txs.length])

  return (
    <>
      <Header back text='Activity' />
      <Content>
        <Padded>{refreshing ? <LoadingLogo /> : txs.length === 0 ? <EmptyTxList /> : <TransactionsList />}</Padded>
      </Content>
    </>
  )
}
