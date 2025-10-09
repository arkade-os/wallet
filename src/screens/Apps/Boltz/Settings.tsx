import { useContext } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Toggle from '../../../components/Toggle'
import Text from '../../../components/Text'
import { LightningContext } from '../../../providers/lightning'

export default function AppBoltz() {
  const { connected, toggleConnection, swapProvider } = useContext(LightningContext)
  const { navigate } = useContext(NavigationContext)

  return (
    <>
      <Header text='Boltz settings' back={() => navigate(Pages.AppBoltz)} />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <Toggle
              checked={connected}
              onClick={toggleConnection}
              text='Enable Boltz'
              subtext='Turn Boltz integration on or off'
            />
            <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
              <Text thin>Boltz API URL</Text>
              <Text color='dark50' small thin>
                {swapProvider?.getApiUrl() ?? 'No server available'}
              </Text>
            </FlexCol>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
