import { useContext } from 'react'
import { Fiats } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Fiat() {
  const { config, updateConfig } = useContext(ConfigContext)

  return (
    <>
      <Header text='Fiat' back />
      <Content>
        <Padded>
          <Select
            onChange={(fiat) => updateConfig({ ...config, fiat: fiat as Fiats }, true)}
            options={[Fiats.EUR, Fiats.USD]}
            selected={config.fiat}
          />
        </Padded>
      </Content>
    </>
  )
}
