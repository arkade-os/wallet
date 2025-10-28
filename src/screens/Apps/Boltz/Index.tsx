import { useContext } from 'react'
import Shadow from '../../../components/Shadow'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import FlexRow from '../../../components/FlexRow'
import SwapsList from '../../../components/SwapsList'
import Text, { TextLabel } from '../../../components/Text'
import { SettingsIconLight } from '../../../icons/Settings'
import { LightningContext } from '../../../providers/lightning'
import { GreenStatusIcon, RedStatusIcon } from '../../../icons/Status'
import { NavigationContext, Pages } from '../../../providers/navigation'

export default function AppBoltz() {
  const { connected, swapProvider } = useContext(LightningContext)
  const { navigate } = useContext(NavigationContext)

  const ConnectionStatus = () => (
    <FlexRow end>
      {connected ? <GreenStatusIcon small /> : <RedStatusIcon small />}
      <Text color={connected ? 'green' : 'red'} small thin>
        {connected ? 'Connected' : 'Disconnected'}
      </Text>
    </FlexRow>
  )

  return (
    <>
      <Header
        auxFunc={() => navigate(Pages.AppBoltzSettings)}
        auxIcon={<SettingsIconLight />}
        text=''
        back={() => navigate(Pages.Apps)}
      />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <h1>Boltz</h1>
            <FlexCol gap='0'>
              <TextLabel>Connection status</TextLabel>
              <Shadow fat>
                <FlexRow between>
                  <Text>{swapProvider?.getApiUrl()}</Text>
                  <ConnectionStatus />
                </FlexRow>
              </Shadow>
            </FlexCol>
            <SwapsList />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
