import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import ArrowIcon from '../../icons/Arrow'
import { SettingsOptions, Themes } from '../../lib/types'
import { OptionsContext } from '../../providers/options'
import Focusable from '../../components/Focusable'
import Toggle from '../../components/Toggle'
import { hapticSubtle } from '../../lib/haptics'

export default function General() {
  const { config, systemTheme, updateConfig } = useContext(ConfigContext)
  const { setOption } = useContext(OptionsContext)

  const Row = ({ option, value }: { option: SettingsOptions; value: string }) => (
    <Focusable
      onEnter={() => {
        hapticSubtle()
        setOption(option)
      }}
    >
      <FlexRow
        between
        padding='0.8rem 0'
        onClick={() => {
          hapticSubtle()
          setOption(option)
        }}
      >
        <Text capitalize thin>
          {option}
        </Text>
        <FlexRow end>
          <Text small thin color='dark50'>
            {value}
          </Text>
          <ArrowIcon />
        </FlexRow>
      </FlexRow>
    </Focusable>
  )

  return (
    <>
      <Header text='General' back />
      <Content>
        <Padded>
          <FlexCol gap='0'>
            <Row
              option={SettingsOptions.Theme}
              value={config.theme === Themes.Auto ? `Auto (${systemTheme})` : config.theme}
            />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Fiat} value={config.fiat} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Display} value={config.currencyDisplay} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Toggle
              checked={config.haptics}
              onClick={() => updateConfig({ ...config, haptics: !config.haptics })}
              text='Haptic feedback'
              subtext='Vibration on button taps and interactions'
            />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
