import { useContext } from 'react'
import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsOptions, SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { DevModeContext } from '../../providers/devMode'
import { AspContext } from '../../providers/asp'
import { isMainnet } from '../../lib/constants'
import Padded from '../../components/Padded'

export default function Advanced() {
  const { devMode } = useContext(DevModeContext)
  const { aspInfo } = useContext(AspContext)
  const rows = options
    .filter((o) => o.section === SettingsSections.Advanced)
    .filter((o) => o.option !== SettingsOptions.Contracts || devMode)
    .filter((o) => o.option !== SettingsOptions.Server || !isMainnet(aspInfo.network))

  return (
    <>
      <Header text='Advanced' back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>Advanced</p>
              <Menu rows={rows} styled />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
