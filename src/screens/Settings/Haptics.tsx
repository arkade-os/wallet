import Header from './Header'
import { useContext } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'

export default function Haptics() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async () => {
    const newConfig = { ...config, haptics: !config.haptics }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  return (
    <>
      <Header text='Haptics' back />
      <Content>
        <Padded>
          <Toggle
            checked={config.haptics}
            onClick={handleChange}
            text='Haptic feedback'
            subtext='Vibration on button taps and interactions'
          />
        </Padded>
      </Content>
    </>
  )
}
