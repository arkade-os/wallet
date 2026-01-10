import Header from './Header'
import { options, optionsUsingPrivKey } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { WalletContext } from '../../providers/wallet'
import { useContext } from 'react'

export default function Advanced() {
  const { wallet } = useContext(WalletContext)
  const excludeInReaonlyMode = wallet.isReadonly ? optionsUsingPrivKey : new Set()
  const rows = options.filter((o) => o.section === SettingsSections.Advanced && !excludeInReaonlyMode.has(o.option))

  return (
    <>
      <Header text='Advanced' back />
      <Content>
        <Menu rows={rows} />
      </Content>
    </>
  )
}
