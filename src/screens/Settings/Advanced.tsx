import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'

export default function Advanced() {
  const rows = [SettingsSections.Advanced].map((section) => {
    return {
      section,
      options: options.filter((o) => o.section === section),
    }
  })

  return (
    <>
      <Header text='Advanced' back />
      <Content>
        <Menu rows={rows} />
      </Content>
    </>
  )
}
