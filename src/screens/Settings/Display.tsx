import { useContext } from 'react'
import { CurrencyDisplay, DenominationFormat } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'
import Text from '../../components/Text'

export default function Display() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async (currencyDisplay: string) => {
    const newConfig = { ...config, currencyDisplay: currencyDisplay as CurrencyDisplay }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  const handleDenominationChange = async (denominationFormat: string) => {
    const newConfig = { ...config, denominationFormat: denominationFormat as DenominationFormat }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  return (
    <>
      <Header text='Display preferences' back />
      <Content>
        <Padded>
          <Text color='dark50' smaller>
            Currency display
          </Text>
          <Select
            onChange={handleChange}
            options={[CurrencyDisplay.Both, CurrencyDisplay.Bitcoin, CurrencyDisplay.Fiat]}
            selected={config.currencyDisplay}
          />
        </Padded>
        <Padded>
          <Text color='dark50' smaller>
            Bitcoin denomination
          </Text>
          <Select
            onChange={handleDenominationChange}
            options={[DenominationFormat.Bip177, DenominationFormat.Sats]}
            labels={['BIP-177', 'Satoshis']}
            selected={config.denominationFormat}
          />
        </Padded>
      </Content>
    </>
  )
}
