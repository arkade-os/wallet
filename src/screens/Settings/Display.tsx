import { useContext } from 'react'
import { CurrencyDisplay } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Display() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async (currencyDisplay: string) => {
    const newConfig = { ...config, currencyDisplay: currencyDisplay as CurrencyDisplay }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  return (
    <>
      <Header text='Display preferences' back />
      <Content>
        <Padded>
          <Select
            onChange={handleChange}
            options={[CurrencyDisplay.Both, CurrencyDisplay.Bitcoin, CurrencyDisplay.Fiat]}
            selected={config.currencyDisplay}
          />
        </Padded>
      </Content>
    </>
  )
}
