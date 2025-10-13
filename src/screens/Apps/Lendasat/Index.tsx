import { useContext, useRef } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { SettingsIconLight } from '../../../icons/Settings'
import { NavigationContext, Pages } from '../../../providers/navigation'

export default function AppLendasat() {
  const { navigate } = useContext(NavigationContext)

  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <>
      <Header
        auxFunc={() => navigate(Pages.AppLendasat)}
        auxIcon={<SettingsIconLight />}
        text='Lendasat'
        back={() => navigate(Pages.Apps)}
      />
      <Content>
        <Padded>
          <FlexCol gap='2rem'>
            <iframe
              ref={iframeRef}
              src="http://localhost:5173"
              title="Lendasat"
              className="lendasat-iframe"
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
