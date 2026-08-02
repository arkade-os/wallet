import Header from './Header'
import { useContext } from 'react'
import Padded from '../../components/Padded'
import Toggle from '../../components/Toggle'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import { BackupContext } from '@/providers/backup'

export default function Haptics() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)

  const handleChange = async () => {
    backupAndUpdateConfig({ ...config, haptics: !config.haptics })
  }

  return (
    <>
      <Header text='Haptics' back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>Feedback</p>
              <Toggle
                checked={config.haptics}
                onClick={handleChange}
                text='Haptic feedback'
                subtext='Vibration on button taps and interactions'
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
