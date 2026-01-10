import Header from './Header'
import { options, optionsUsingPrivKey } from '../../providers/options'
import Content from '../../components/Content'
import { SettingsSections } from '../../lib/types'
import Menu from '../../components/Menu'
import { WalletContext } from '../../providers/wallet'
import { useContext } from 'react'
import ReadonlyWallet from '../../components/ReadonlyWallet'

export default function Advanced() {
  const { wallet } = useContext(WalletContext)
  const excludeInReadonlyMode = wallet.isReadonly ? optionsUsingPrivKey : new Set()
  const rows = options.filter((o) => o.section === SettingsSections.Advanced && !excludeInReadonlyMode.has(o.option))

  return (
    <>
      <Header text='Advanced' back />
      <Content>
        {wallet.isReadonly ? (
          <div style={{ padding: '0 1rem 1rem 1rem' }}>
            <ReadonlyWallet />
          </div>
        ) : null}
        <Menu rows={rows} />
      </Content>
    </>
  )
}
