import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import Text, { TextLabel } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { useContext } from 'react'
import { NavigationContext, Pages } from '../../providers/navigation'
import Shadow from '../../components/Shadow'

export default function SettingsMenu() {
  const { navigate } = useContext(NavigationContext)

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
          {import.meta.env.DEV ? (
            <FlexCol gap='0'>
              <TextLabel>Dev tools</TextLabel>
              <Shadow onClick={() => navigate(Pages.ComponentPreview)}>
                <Text>Component preview</Text>
              </Shadow>
            </FlexCol>
          ) : null}
        </FlexCol>
      </Content>
    </>
  )
}
