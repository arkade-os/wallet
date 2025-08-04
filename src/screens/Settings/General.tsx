import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import FlexRow from '../../components/FlexRow'
import ArrowIcon from '../../icons/Arrow'
import { SettingsOptions } from '../../lib/types'
import { OptionsContext } from '../../providers/options'

export default function General() {
  const { config } = useContext(ConfigContext)
  const { setOption } = useContext(OptionsContext)

  const Row = ({ option, value }: { option: SettingsOptions; value: string }) => (
    <FlexRow between padding='0.5rem 0' onClick={() => setOption(option)}>
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
  )

  return (
    <>
      <Header text='General' back />
      <Content>
        <Padded>
          <FlexCol gap='0'>
            <Row option={SettingsOptions.Theme} value={config.theme} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Fiat} value={config.fiat} />
            <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
            <Row option={SettingsOptions.Display} value={config.currencyDisplay} />
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
