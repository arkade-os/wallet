import { useId } from 'react'
import Text from './Text'
import { Switch } from './ui/switch'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, onClick, text, subtext, testId }: ToggleProps) {
  const id = useId()

  // Haptic feedback is owned by the Switch primitive (fires 'selection' on
  // change). Do NOT trigger haptics here or taps will double-fire.
  return (
    <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
      <label htmlFor={id} style={{ cursor: 'pointer', display: 'block', minHeight: 44, width: '100%' }}>
        <FlexRow between>
          <Text thin>{text}</Text>
          <Switch id={id} checked={checked} onCheckedChange={onClick} data-testid={testId} aria-checked={checked} />
        </FlexRow>
      </label>
      {subtext ? (
        <Text color='neutral-500' small thin wrap>
          {subtext}
        </Text>
      ) : null}
    </FlexCol>
  )
}
