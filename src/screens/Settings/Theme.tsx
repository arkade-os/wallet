import { useContext } from 'react'
import { Themes } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Theme() {
  const { backupConfig, config, effectiveTheme, updateConfig } = useContext(ConfigContext)

  const handleChange = async (theme: string) => {
    const newConfig = { ...config, theme: theme as Themes }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  const options = [Themes.Auto, Themes.Dark, Themes.Light]
  const labels = options.map((option) =>
    option === Themes.Auto ? `Auto (${effectiveTheme})` : option,
  )

  return (
    <>
      <Header text='Theme' back />
      <Content>
        <Padded>
          <Select labels={labels} onChange={handleChange} options={options} selected={config.theme} />
        </Padded>
      </Content>
    </>
  )
}
