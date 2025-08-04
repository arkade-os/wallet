import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { TextLabel } from '../../components/Text'
import FlexCol from '../../components/FlexCol'

export default function SettingsMenu() {
  // get rows for General and Security sections
  const generalRows = options.filter((o) => o.section === SettingsSections.General)
  const securityRows = options.filter((o) => o.section === SettingsSections.Security)

  return (
    <>
      <Header text='Settings' />
      <Content>
        <FlexCol gap='1.25rem'>
          <FlexCol gap='0'>
            <TextLabel>General</TextLabel>
            <Menu rows={generalRows} styled />
          </FlexCol>
          <FlexCol gap='0'>
            <TextLabel>Security</TextLabel>
            <Menu rows={securityRows} styled />
          </FlexCol>
        </FlexCol>
      </Content>
    </>
  )
}
