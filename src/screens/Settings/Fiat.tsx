import { useContext } from 'react'
import { Fiats } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Fiat() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async (fiat: string) => {
    const newConfig = { ...config, fiat: fiat as Fiats }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  return (
    <>
      <Header text='Currency' back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>Currency</p>
              <Select
                onChange={handleChange}
                options={[Fiats.BTC, Fiats.CHF, Fiats.CNY, Fiats.EUR, Fiats.GBP, Fiats.JPY, Fiats.USD]}
                selected={config.fiat}
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
