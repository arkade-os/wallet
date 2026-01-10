import { useContext, useEffect, useState } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import Loading from '../../components/Loading'
import Header from '../../components/Header'
import { setPrivateKey } from '../../lib/privateKey'
import { consoleError, consoleLog } from '../../lib/logs'
import { LightningContext } from '../../providers/lightning'

export default function InitConnect() {
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { arkadeLightning, restoreSwaps } = useContext(LightningContext)
  const { navigate } = useContext(NavigationContext)
  const { initWallet, initReadonlyWallet, svcWallet, reloadWallet } = useContext(WalletContext)

  const [initialized, setInitialized] = useState(false)

  const { password, privateKey, publicKey } = initInfo

  useEffect(() => {
    if (publicKey) {
      initReadonlyWallet(publicKey)
        .then(() => setInitialized(true))
        .catch(consoleError)
      return
    }
    if (!password || !privateKey) return
    setPrivateKey(privateKey, password)
      .then(() => initWallet(privateKey))
      .then(() => setInitialized(true))
      .catch((err) => consoleError(err, 'Error initializing wallet:'))
  }, [])

  useEffect(() => {
    if (!initialized) return
    if (!initInfo.restoring) return handleProceed()
    if (!arkadeLightning || !svcWallet) return
    reloadWallet() // side-effect to refresh transaction history
    restoreSwaps()
      .then((count) => count && consoleLog(`Restored ${count} swaps from network`))
      .catch((err) => consoleError(err, 'Error restoring swaps:'))
      .finally(handleProceed)
  }, [svcWallet, arkadeLightning, initialized, initInfo.restoring])

  const handleCancel = () => navigate(Pages.Init)

  const handleProceed = () => {
    setInitInfo({ ...initInfo, password: undefined, privateKey: undefined })
    navigate(Pages.Wallet)
  }

  return (
    <>
      <Header text='Connecting to server' back={handleCancel} />
      <Content>
        <Loading text='Connecting to server' />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={handleCancel} label='Cancel' secondary />
      </ButtonsOnBottom>
    </>
  )
}
