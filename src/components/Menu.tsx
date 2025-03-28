import { useContext } from 'react'
import ArrowIcon from '../icons/Arrow'
import { OptionsContext, SectionResponse } from '../providers/options'
import Text, { TextLabel } from './Text'
import FlexRow from './FlexRow'
import { SettingsOptions } from '../lib/types'
import FlexCol from './FlexCol'

export default function Advanced({ rows }: { rows: SectionResponse[] }) {
  const { setOption } = useContext(OptionsContext)

  const border = '1px solid var(--dark10)'

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
    <FlexCol gap='1.25rem'>
      {rows.map((op) => (
        <div key={op.section} style={{ width: '100%' }}>
          <TextLabel>{op.section}</TextLabel>
          <div style={{ borderTop: border }}>
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
  )
}
