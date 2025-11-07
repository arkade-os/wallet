import { useContext } from 'react'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Success from '../../components/Success'
import { FlowContext } from '../../providers/flow'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { ConfigContext } from '../../providers/config'

export default function InitSuccess() {
  const { config } = useContext(ConfigContext)
  const { initInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const headline = initInfo.restoring ? 'Wallet restored successfully!' : 'Your new wallet is live!'

  const text = initInfo.restoring
    ? config.lastBackup
      ? 'Your wallet, settings and swaps have been successfully restored.'
      : 'Your wallet has been successfully restored and is now ready to use.'
    : 'Your wallet has been successfully created and is now ready to use.'

  return (
    <>
      <Header text='Create new wallet' />
      <Content>
        <Success headline={headline} text={text} />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={() => navigate(Pages.InitConnect)} label='Go to wallet' />
      </ButtonsOnBottom>
    </>
  )
}
