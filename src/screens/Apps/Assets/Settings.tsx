import { useContext } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Toggle from '../../../components/Toggle'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext, Pages } from '../../../providers/navigation'

export default function AppAssetsSettings() {
  const { config, updateConfig } = useContext(ConfigContext)
  const { navigate } = useContext(NavigationContext)

  const toggleConnection = () => {
    const enabling = !config.apps.assets.enabled
    updateConfig({ ...config, apps: { ...config.apps, assets: { enabled: enabling } } })
    if (enabling) navigate(Pages.AppAssets)
  }

  return (
    <>
      <Header text='Assets settings' back />
      <Content>
        <Padded>
          <FlexCol>
            <Toggle
              checked={config.apps.assets.enabled}
              onClick={toggleConnection}
              text='Enable Assets'
              subtext='Turn Assets integration on or off'
              testId='assets-toggle'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
