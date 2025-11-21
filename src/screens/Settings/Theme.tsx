import { useContext } from 'react'
import { Themes } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Theme() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async (theme: string) => {
    const newConfig = { ...config, theme: theme as Themes }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  return (
    <>
      <Header text='Theme' back />
      <Content>
        <Padded>
          <Select onChange={handleChange} options={[Themes.Dark, Themes.Light]} selected={config.theme} />
        </Padded>
      </Content>
    </>
  )
}
