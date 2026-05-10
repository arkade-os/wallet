import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import Padded from '../../components/Padded'

export default function Advanced() {
  const rows = options.filter((o) => o.section === SettingsSections.Advanced)

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
