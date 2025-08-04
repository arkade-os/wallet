import { useContext } from 'react'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Success from '../../components/Success'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'

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
