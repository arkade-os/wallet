import { useContext } from 'react'
import ArrowIcon from '../icons/Arrow'
import { Option, OptionsContext } from '../providers/options'
import { SettingsOptions } from '../lib/types'
import FlexCol from './FlexCol'
import { hapticSubtle } from '../lib/haptics'
import { cn } from '@/lib/utils'

interface MenuProps {
  rows: Option[]
  styled?: boolean
}

export default function Menu({ rows, styled }: MenuProps) {
  const { setOption } = useContext(OptionsContext)

  const selectOption = (option: SettingsOptions) => {
    hapticSubtle()
    setOption(option)
  }

  return (
    <FlexCol gap='0' className={styled ? 'settings-row-group' : 'settings-row-group settings-row-group--plain'}>
      {rows.map(({ icon, option }) => (
        <button
          type='button'
          onClick={() => selectOption(option)}
          className={cn('settings-row', option === SettingsOptions.Reset && 'settings-row--danger')}
          key={option}
        >
          <span className='settings-row__main'>
            {styled ? <span className='settings-row__icon'>{icon}</span> : null}
            <span className='settings-row__label'>{option}</span>
          </span>
          <span className='settings-row__chevron' aria-hidden='true'>
            <ArrowIcon />
          </span>
        </button>
      ))}
    </FlexCol>
  )
}
