import { useContext } from 'react'
import { ConfigContext } from '../../providers/config'
import Content from '../../components/Content'
import Padded from '../../components/Padded'
import Header from './Header'
import { TextSecondary } from '../../components/Text'
import Toggle from '../../components/Toggle'
import FlexCol from '../../components/FlexCol'
import { Themes } from '../../lib/types'

export default function Theme() {
  const { config, updateConfig } = useContext(ConfigContext)

  const handleChange = () => {
    const theme = config.theme === Themes.Dark ? Themes.Light : Themes.Dark
    updateConfig({ ...config, theme })
  }

  return (
    <>
      <Header text='Theme' back />
      <Content>
        <Toggle checked={config.theme === Themes.Dark} label='Theme' onClick={handleChange} text='Dark theme' />
        <Padded>
          <FlexCol gap='0.5rem' margin='2rem 0 0 0'>
            <TextSecondary>Dark theme is easier on the eyes.</TextSecondary>
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}
