import CheckedIcon from '../icons/Checked'
import FlexRow from './FlexRow'
import Text from './Text'

interface SelectProps {
  onChange: (value: any) => void
  options: string[]
  selected: string
}

export default function Select({ onChange, options, selected }: SelectProps) {
  return (
    <>
      {options.map((option, index) => (
        <div key={option} style={{ width: '100%' }}>
          <FlexRow between key={option} onClick={() => onChange(option)} padding='0.5rem 0'>
            <Text thin>{option}</Text>
            {option === selected && <CheckedIcon small />}
          </FlexRow>
          {index < options.length - 1 && <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />}
        </div>
      ))}
    </>
  )
}
