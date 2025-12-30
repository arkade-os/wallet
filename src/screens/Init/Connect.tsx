import { useContext, useEffect } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import Loading from '../../components/Loading'
import Header from '../../components/Header'
import { setPrivateKey } from '../../lib/privateKey'
import { consoleError } from '../../lib/logs'

export default function InitConnect() {
  const { initInfo, setInitInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { initWallet, initReadonlyWallet, svcWallet, reloadWallet, initialized } = useContext(WalletContext)

  const { password, privateKey, publicKey } = initInfo

  useEffect(() => {
    if (svcWallet && initialized) {
      reloadWallet().then(() => navigate(Pages.Wallet))
    }
  }, [svcWallet, initialized])

  useEffect(() => {
    if (publicKey) {
      console.log('init readonly wallet with public key', publicKey)
      initReadonlyWallet(publicKey)
        .then(() => setInitInfo({ ...initInfo, publicKey: undefined }))
        .catch(consoleError)
      return
    }
    if (!password || !privateKey) return
    setPrivateKey(privateKey, password)
      .then(() => initWallet(privateKey))
      .then(() => setInitInfo({ ...initInfo, password: '', privateKey: undefined }))
      .catch(consoleError)
  }, [])

  const handleCancel = () => navigate(Pages.Init)

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
