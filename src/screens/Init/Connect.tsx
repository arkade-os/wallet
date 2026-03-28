import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
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

export default function InitConnect() {
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { arkadeSwaps, restoreSwaps } = useContext(SwapsContext)
  const { navigate } = useContext(NavigationContext)
  const { initWallet } = useContext(WalletContext)

  const loadingStatus = useLoadingStatus()
  const [initialized, setInitialized] = useState(false)
  const [connectDone, setConnectDone] = useState(false)
  const pendingNav = useRef<() => void>()

  const { password, privateKey } = initInfo

  useEffect(() => {
    if (!password || !privateKey) return
    let cancelled = false
    setPrivateKey(privateKey, password)
      .then(() => {
        if (cancelled) return
        return initWallet(privateKey)
      })
      .then(() => {
        if (cancelled) return
        setInitialized(true)
      })
      .catch((err) => consoleError(err, 'Error initializing wallet:'))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (!initInfo.restoring) return handleProceed()
    if (!arkadeSwaps) return
    setLoadingStatus('Restoring swaps...')
    restoreSwaps()
      .then((count) => count && consoleLog(`Restored ${count} swaps from network`))
      .catch((err) => consoleError(err, 'Error restoring swaps:'))
      .finally(handleProceed)
  }, [arkadeSwaps, initialized, initInfo.restoring])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
    pendingNav.current = () => {
      setInitInfo({ ...initInfo, password: undefined, privateKey: undefined })
      navigate(Pages.Wallet)
    }
    setConnectDone(true)
  }

  const handleExitComplete = useCallback(() => {
    pendingNav.current?.()
  }, [])

  return (
    <>
      <Header text='Connecting to server' back={handleCancel} />
      <Content>
        <LoadingLogo
          text={loadingStatus || 'Connecting to server'}
          done={connectDone}
          exitMode={connectDone ? 'fly-up' : 'none'}
          onExitComplete={handleExitComplete}
        />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
