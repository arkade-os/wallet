import { useContext } from 'react'
import { Currencies } from '../../lib/types'
import Select from '../../components/Select'
import Padded from '../../components/Padded'
import Content from '../../components/Content'
import { ConfigContext } from '../../providers/config'
import Header from './Header'
import TokenLogo, { tokenLogoTickerForTicker } from '../../components/TokenLogo'
import { BackupContext } from '@/providers/backup'

export default function Currency() {
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { config } = useContext(ConfigContext)

  const handleChange = async (currency: string) => {
    backupAndUpdateConfig({ ...config, currency: currency as Currencies })
  }

  return (
    <>
      <Header text='Currency' back />
      <Content>
        <Padded>
          <div className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>Currency</p>
              <Select
                onChange={handleChange}
                options={[
                  Currencies.BRL,
                  Currencies.BTC,
                  Currencies.CHF,
                  Currencies.CNY,
                  Currencies.EUR,
                  Currencies.GBP,
                  Currencies.JPY,
                  Currencies.USD,
                ]}
                renderStart={(currency) => {
                  const ticker = tokenLogoTickerForTicker(currency)
                  return ticker ? <TokenLogo ticker={ticker} /> : null
                }}
                selected={config.currency}
              />
            </section>
          </div>
        </Padded>
      </Content>
    </>
  )
}
