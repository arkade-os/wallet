import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import { CurrencyDisplay, Fiats, Themes } from '../../lib/types'
import Select from '../../components/Select'
import FlexCol from '../../components/FlexCol'

export default function General() {
  const { config, updateConfig } = useContext(ConfigContext)

  const handleCurrencyDisplayChange = (currencyDisplay: CurrencyDisplay) => {
    updateConfig({ ...config, currencyDisplay })
  }

  const handleFiatChange = (fiat: Fiats) => {
    updateConfig({ ...config, fiat })
  }

  const handleThemeChange = (theme: Themes) => {
    updateConfig({ ...config, theme })
  }

  return (
    <>
      <Header text='General' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem'>
            <Select
              onSelect={handleThemeChange}
              options={[Themes.Dark, Themes.Light]}
              selected={config.theme}
              title='Theme'
            />
            <Select
              onSelect={handleFiatChange}
              options={[Fiats.EUR, Fiats.USD]}
              selected={config.fiat}
              title='Fiat currency'
            />
            <Select
              onSelect={handleCurrencyDisplayChange}
              options={[CurrencyDisplay.Both, CurrencyDisplay.Sats, CurrencyDisplay.Fiat]}
              selected={config.currencyDisplay}
              title='Display preferences'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
