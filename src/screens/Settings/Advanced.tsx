import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'

export default function Advanced() {
  const rows = options.filter((o) => o.section === SettingsSections.Advanced)

  return (
    <>
      <Header text='Advanced' back />
      <Content>
        <Menu rows={rows} />
      </Content>
    </>
  )
}
