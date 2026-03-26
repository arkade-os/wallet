import { useId } from 'react'
import Text from './Text'
import { Switch } from './ui/switch'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { hapticLight } from '../lib/haptics'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, onClick, text, subtext, testId }: ToggleProps) {
  const id = useId()

  const handleChange = () => {
    hapticLight()
    onClick()
  }

  return (
    <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
      <label htmlFor={id} style={{ cursor: 'pointer', display: 'block', minHeight: 44 }}>
        <FlexRow between>
          <Text thin>{text}</Text>
          <Switch
            id={id}
            checked={checked}
            onCheckedChange={handleChange}
            data-testid={testId}
            aria-checked={checked}
          />
        </FlexRow>
      </label>
      {subtext ? (
        <Text color='dark50' small thin wrap>
          {subtext}
        </Text>
      ) : null}
    </FlexCol>
  )
}
