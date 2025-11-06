import { useContext } from 'react'
import { Themes } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Theme() {
  const { config, updateConfig } = useContext(ConfigContext)

  return (
    <>
      <Header text='Theme' back />
      <Content>
        <Padded>
          <Select
            onChange={(theme: string) => updateConfig({ ...config, theme: theme as Themes }, true)}
            options={[Themes.Dark, Themes.Light]}
            selected={config.theme}
          />
        </Padded>
      </Content>
    </>
  )
}
