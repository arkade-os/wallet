import { useContext } from 'react'
import ArrowIcon from '../icons/Arrow'
import { Option, OptionsContext } from '../providers/options'
import Text from './Text'
import FlexRow from './FlexRow'
import { SettingsOptions } from '../lib/types'
import FlexCol from './FlexCol'

interface MenuProps {
  rows: Option[]
  styled?: boolean
}

export default function Menu({ rows, styled }: MenuProps) {
  const { setOption } = useContext(OptionsContext)

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

  const handleKeyDown = (e: React.KeyboardEvent, option: SettingsOptions) => {
    if (e.key === 'Enter') setOption(option)
  }

  return (
    <FlexCol gap='0'>
      {rows.map(({ icon, option }) => (
        <div key={option} tabIndex={0} className='focusable' onKeyDown={(e) => handleKeyDown(e, option)}>
          <FlexRow between>
            <div onClick={() => setOption(option)} style={rowStyle(option)}>
              <FlexRow>
                {styled ? icon : null}
                <Text capitalize>{option}</Text>
              </FlexRow>
              <ArrowIcon />
            </div>
          </FlexRow>
        </div>
      ))}
    </FlexCol>
  )
}
