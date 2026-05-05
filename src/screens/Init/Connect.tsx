import { useContext, useEffect, useState } from 'react'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import LoadingLogo from '../../components/LoadingLogo'
import Header from '../../components/Header'
import { setPrivateKey } from '../../lib/privateKey'
import { consoleError, consoleLog } from '../../lib/logs'
import { SwapsContext } from '../../providers/swaps'
import { useLoadingStatus } from '../../hooks/useLoadingStatus'
import { setLoadingStatus } from '../../lib/loadingStatus'
import { NavigationContext, Pages } from '../../providers/navigation'

export default function InitConnect() {
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { arkadeSwaps, restoreSwaps } = useContext(SwapsContext)
  const { navigate } = useContext(NavigationContext)
  const { initWallet } = useContext(WalletContext)

  const loadingStatus = useLoadingStatus()
  const [error, setError] = useState<string>()
  const [initialized, setInitialized] = useState(false)
  const [connectDone, setConnectDone] = useState(false)

  const { password, privateKey } = initInfo

  useEffect(() => {
    if (!password || !privateKey) return
    setPrivateKey(privateKey, password)
      .then(() => initWallet(privateKey))
      .then(() => setInitialized(true))
      .catch(abortConnectionWithError)
  }, [])

  useEffect(() => {
    if (!initialized || !arkadeSwaps) return
    if (!initInfo.restoring) return setConnectDone(true)
    setLoadingStatus('Restoring swaps...')
    restoreSwaps()
      .then((count) => count && consoleLog(`Restored ${count} swaps from network`))
      .catch((err) => consoleError(err, 'Error restoring swaps:'))
      .finally(() => setConnectDone(true))
  }, [arkadeSwaps, initialized, initInfo.restoring])

  const handleExitComplete = () => {
    setInitInfo({ ...initInfo, password: undefined, privateKey: undefined })
    navigate(error ? Pages.Init : Pages.Wallet)
  }

  const abortConnectionWithError = (err: any) => {
    consoleError(err, 'Error during connection:')
    setLoadingStatus('Connection failed')
    setError('Connection failed')
    setConnectDone(true)
  }

  return (
    <>
      <Header text='Connecting to server' />
      <Content>
        <LoadingLogo
          text={loadingStatus || 'Connecting to server'}
          exitMode={connectDone ? 'fly-up' : 'none'}
          onExitComplete={handleExitComplete}
          done={connectDone}
        />
      </Content>
    </>
  )
}
