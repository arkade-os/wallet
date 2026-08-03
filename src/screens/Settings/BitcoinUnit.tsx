import { useContext } from 'react'
import { Unit } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'
import { BackupContext } from '@/providers/backup'

export default function Display() {
  const { config } = useContext(ConfigContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)

  const handleChange = async (value: string) => {
    const unit = value as Unit
    backupAndUpdateConfig({ ...config, unit })
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
