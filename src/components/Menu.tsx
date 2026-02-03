import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { useContext } from 'react'
import Focusable from './Focusable'
import ArrowIcon from '../icons/Arrow'
import RedDotIcon from '../icons/RedDot'
import { SettingsOptions } from '../lib/types'
import { NudgeContext } from '../providers/nudge'
import { Option, OptionsContext } from '../providers/options'

interface MenuProps {
  rows: Option[]
  styled?: boolean
}

export default function Menu({ rows, styled }: MenuProps) {
  const { setOption } = useContext(OptionsContext)
  const { optionHasNudge } = useContext(NudgeContext)

  const bgColor = styled ? 'var(--dark10)' : 'transparent'

  const rowStyle = (option: SettingsOptions) => ({
    alignItems: 'center',
    backgroundColor: option === SettingsOptions.Reset ? 'var(--redbg)' : bgColor,
    borderBottom: '1px solid var(--dark10)',
    color: option === SettingsOptions.Reset ? 'white' : 'var(--dark)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.7rem 1rem',
    width: '100%',
  })

  return (
    <FlexCol gap='0'>
      {rows.map(({ icon, option }) => (
        <Focusable onEnter={() => setOption(option)} key={option}>
          <div key={option} onClick={() => setOption(option)} style={rowStyle(option)}>
            <FlexRow between>
              <FlexRow>
                {styled ? icon : null}
                <Text capitalize>{option}</Text>
              </FlexRow>
              <FlexRow end>
                {optionHasNudge(option) ? <RedDotIcon /> : null}
                <ArrowIcon />
              </FlexRow>
            </FlexRow>
          </div>
        </Focusable>
      ))}
    </FlexCol>
  )
}
