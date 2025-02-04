import { useContext, useEffect } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import { WalletContext } from '../../providers/wallet'
import Loading from '../../components/Loading'
import Header from '../../components/Header'

export default function InitConnect() {
  const { navigate } = useContext(NavigationContext)
  const { initInfo } = useContext(FlowContext)
  const { initWallet } = useContext(WalletContext)

  const { password, privateKey } = initInfo

  useEffect(() => {
    if (!password || !privateKey) return
    initWallet(password, privateKey).then(() => navigate(Pages.Wallet))
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
