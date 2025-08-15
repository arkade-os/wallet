import { useContext } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { SettingsIconLight } from '../../../icons/Settings'
import { NavigationContext, Pages } from '../../../providers/navigation'
import Text, { TextLabel } from '../../../components/Text'
import Shadow from '../../../components/Shadow'
import FlexRow from '../../../components/FlexRow'
import CheckedIcon from '../../../icons/Checked'
import { EmptySwapList } from '../../../components/Empty'
import CenterScreen from '../../../components/CenterScreen'

export default function AppBoltz() {
  const { navigate } = useContext(NavigationContext)

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
                  <Text>https://boltz.arkade.sh</Text>
                  <FlexRow end>
                    <CheckedIcon small />
                    <Text color='green' small thin>
                      Connected
                    </Text>
                  </FlexRow>
                </FlexRow>
              </Shadow>
            </FlexCol>
          </FlexCol>
          <CenterScreen>
            <EmptySwapList
              text='No swaps yet'
              secondaryText='Your swap history will appear here once you start swapping.'
            />
          </CenterScreen>
        </Padded>
      </Content>
    </>
  )
}
