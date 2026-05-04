import Text from './Text'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import { Switch } from '@/components/ui/switch'
import { hapticLight } from '../lib/haptics'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, onClick, text, subtext, testId }: ToggleProps) {
  const handleChange = () => {
    hapticLight()
    onClick()
  }

  return (
    <FlexCol border gap='0.5rem' padding='0 0 1rem 0'>
      <FlexRow between>
        <Text thin>{text}</Text>
        <Switch
          checked={checked}
          onCheckedChange={handleChange}
          data-testid={testId}
          data-checked={checked ? 'true' : 'false'}
          size='lg'
        />
      </FlexRow>
      {subtext ? (
        <Text color='neutral-500' small thin wrap>
          {subtext}
        </Text>
      ) : null}
    </FlexCol>
  )
}
