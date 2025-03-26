import { useContext } from 'react'
import ArrowIcon from '../../icons/Arrow'
import Header from '../../components/Header'
import { OptionsContext } from '../../providers/options'
import Text, { TextLabel } from '../../components/Text'
import FlexRow from '../../components/FlexRow'
import Content from '../../components/Content'
import { SettingsOptions } from '../../lib/types'
import FlexCol from '../../components/FlexCol'

export default function Menu() {
  const { setOption, validOptions } = useContext(OptionsContext)

  const border = '1px solid var(--dark10)'

  const gridStyle = {
    borderTop: border,
  }

  const rowStyle = (option: SettingsOptions) => ({
    alignItems: 'center',
    backgroundColor: option === SettingsOptions.Reset ? 'var(--redbg)' : 'var(--dark10)',
    borderBottom: border,
    color: option === SettingsOptions.Reset ? 'white' : 'var(--dark)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 1rem',
    width: '100%',
  })

  return (
    <>
      <Header text='Settings' />
      <Content>
        <FlexCol>
          {validOptions().map((op) => (
            <div key={op.section} style={{ width: '100%' }}>
              <TextLabel>{op.section}</TextLabel>
              <div style={gridStyle}>
                {op.options.map(({ icon, option }) => (
                  <div key={option} onClick={() => setOption(option)} style={rowStyle(option)}>
                    <FlexRow>
                      {icon}
                      <Text capitalize>{option}</Text>
                    </FlexRow>
                    <ArrowIcon />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </FlexCol>
      </Content>
    </>
  )
}
