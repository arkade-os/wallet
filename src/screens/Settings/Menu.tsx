import Header from './Header'
import { options, optionsUsingPrivKey } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { TextLabel } from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { useContext } from 'react'
import { WalletContext } from '../../providers/wallet'
import ReadonlyWallet from '../../components/ReadonlyWallet'

export default function SettingsMenu() {
  const { wallet } = useContext(WalletContext)
  const excludeInReaonlyMode = wallet.isReadonly ? optionsUsingPrivKey : new Set()

  // get rows for General and Security sections
  const generalRows = options.filter(
    (o) => o.section === SettingsSections.General && !excludeInReaonlyMode.has(o.option),
  )
  const securityRows = options.filter(
    (o) => o.section === SettingsSections.Security && !excludeInReaonlyMode.has(o.option),
  )

  return (
    <>
      <Header text='Settings' />
      <Content>
        <FlexCol gap='1.25rem'>
          {wallet.isReadonly ? (
            <div style={{ padding: '0 1rem 1rem 1rem' }}>
              <ReadonlyWallet />
            </div>
          ) : null}
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
