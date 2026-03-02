import { useContext } from 'react'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Toggle from '../../../components/Toggle'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { ConfigContext } from '../../../providers/config'

export default function AppAssetsSettings() {
  const { config, setConfig } = useContext(ConfigContext)

  const toggleConnection = () => {
    const newConfig = JSON.parse(JSON.stringify(config))
    newConfig.apps.assets.enabled = !config.apps.assets.enabled
    setConfig(newConfig)
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
