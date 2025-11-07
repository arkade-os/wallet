import { useContext } from 'react'
import { CurrencyDisplay } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Display() {
  const { config, updateConfig } = useContext(ConfigContext)

  return (
    <>
      <Header text='Display preferences' back />
      <Content>
        <Padded>
          <Select
            onChange={(currencyDisplay) =>
              updateConfig({ ...config, currencyDisplay: currencyDisplay as CurrencyDisplay }, true)
            }
            options={[CurrencyDisplay.Both, CurrencyDisplay.Sats, CurrencyDisplay.Fiat]}
            selected={config.currencyDisplay}
          />
        </Padded>
      </Content>
    </>
  )
}
