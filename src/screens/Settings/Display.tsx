import { useContext } from 'react'
import { Unit } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'

export default function Display() {
  const { backupConfig, config, updateConfig } = useContext(ConfigContext)

  const handleChange = async (value: string) => {
    const unit = value as Unit
    const newConfig = { ...config, unit }
    if (config.nostrBackup) await backupConfig(newConfig)
    updateConfig(newConfig)
  }

  return (
    <>
      <Header text='Bitcoin unit' back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>Bitcoin unit</p>
              <Select onChange={handleChange} options={[Unit.BTC, Unit.SATS, Unit.BIP177]} selected={config.unit} />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
