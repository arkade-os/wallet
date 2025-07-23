import { useContext } from 'react'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import Content from '../../components/Content'
import Text from '../../components/Text'
import Header from '../../components/Header'
import FlexCol from '../../components/FlexCol'
import { NavigationContext, Pages } from '../../providers/navigation'
import Success from '../../components/Success'

export default function InitSuccess() {
  const { navigate } = useContext(NavigationContext)

  return (
    <>
      <Header text='Create new wallet' />
      <Content>
        <Success text='Your new wallet is live!' />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={() => navigate(Pages.InitConnect)} label='Go to wallet' />
      </ButtonsOnBottom>
    </>
  )
}
