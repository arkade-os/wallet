import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import FlexCol from '../../components/FlexCol'
import ArrowIcon from '../../icons/Arrow'
import { SettingsOptions, Themes } from '../../lib/types'
import { OptionsContext } from '../../providers/options'
import { hapticSubtle } from '../../lib/haptics'

export default function General() {
  const { config, systemTheme } = useContext(ConfigContext)
  const { setOption } = useContext(OptionsContext)

  const Row = ({ option, value }: { option: SettingsOptions; value: string }) => (
    <button
      type='button'
      className='settings-row settings-row--value'
      onClick={() => {
        hapticSubtle()
        setOption(option)
      }}
    >
      <span className='settings-row__label'>{option}</span>
      <span className='settings-row__side'>
        <span>{value}</span>
        <span className='settings-row__chevron' aria-hidden='true'>
          <ArrowIcon />
        </span>
      </span>
    </button>
  )

  return (
    <>
      <Header text='Display' back />
      <Content>
        <Padded>
          <FlexCol gap='1rem' className='settings-page'>
            <section className='settings-section'>
              <p className='settings-section-label'>Preferences</p>
              <div className='settings-row-group'>
                <Row option={SettingsOptions.Currency} value={config.fiat} />
                <Row option={SettingsOptions.BitcoinUnit} value={config.unit} />
                <Row option={SettingsOptions.Haptics} value={config.haptics ? 'On' : 'Off'} />
                <Row
                  option={SettingsOptions.Theme}
                  value={config.theme === Themes.Auto ? `Auto (${systemTheme})` : config.theme}
                />
              </div>
            </section>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
