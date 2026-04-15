import { useContext } from 'react'
import Header from './Header'
import { options } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { TextLabel } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { NavigationContext } from '../../providers/navigation'

export default function SettingsMenu() {
  // get rows for General and Security sections
  const generalRows = options.filter((o) => o.section === SettingsSections.General)
  const securityRows = options.filter((o) => o.section === SettingsSections.Security)

  // Settings Menu is no longer a root page — back returns to Wallet (or wherever
  // the user came from). Options sub-pages use OptionsContext.goBack internally;
  // we use NavigationContext.goBack here to leave Settings entirely.
  const { goBack } = useContext(NavigationContext)

  return (
    <>
      <Header text='Settings' backFunc={goBack} />
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
