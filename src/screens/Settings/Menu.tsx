import Header from './Header'
import { options, SectionResponse } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'

export default function SettingsMenu() {
  const rows: SectionResponse[] = [SettingsSections.General, SettingsSections.Security].map((section) => {
    return {
      section,
      options: options.filter((o) => o.section === section),
    }
  })

  return (
    <>
      <Header text='Settings' />
      <Content>
        <Menu rows={rows} />
      </Content>
    </>
  )
}
