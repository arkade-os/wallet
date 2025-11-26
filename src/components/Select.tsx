import { GreenStatusIcon } from '../icons/Status'
import { useEffect } from 'react'
import FlexRow from './FlexRow'
import Text from './Text'

interface SelectProps {
  onChange: (value: string) => void
  options: string[]
  selected: string
}

export default function Select({ onChange, options, selected }: SelectProps) {
  useEffect(() => {
    const handleKeyDown = (event: { key: string; keyCode: number }) => {
      const selectedIndex = options.indexOf(selected)
      if (event.key === 'ArrowUp' || event.keyCode === 38) {
        if (selectedIndex > 0) onChange(options[selectedIndex - 1])
      } else if (event.key === 'ArrowDown' || event.keyCode === 40) {
        if (selectedIndex < options.length - 1) onChange(options[selectedIndex + 1])
      }
    }
    // add event listener to the document
    document.addEventListener('keydown', handleKeyDown)
    // cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selected])

  return (
    <>
      {options.map((option, index) => (
        <div key={option} style={{ width: '100%' }}>
          <FlexRow
            between
            testId={`select-option-${index}`}
            key={option}
            onClick={() => onChange(option)}
            padding='0.8rem 0'
          >
            <Text thin>{option}</Text>
            {option === selected && <GreenStatusIcon small />}
          </FlexRow>
          {index < options.length - 1 && <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />}
        </div>
      ))}
    </>
  )
}
