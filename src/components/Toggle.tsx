import Text from './Text'
import { IonToggle } from '@ionic/react'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import Focusable from './Focusable'

interface ToggleProps {
  checked: boolean
  disabled?: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, disabled, onClick, subtext, text, testId }: ToggleProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick()
    }
  }
  return (
    <FlexCol gap='0' padding='0 0 1rem 0'>
      <FlexRow between onClick={handleClick}>
        <Text thin>{text}</Text>
        <Focusable onEnter={handleClick} fit round>
          <IonToggle checked={checked} data-testid={testId} disabled={disabled} />
        </Focusable>
      </FlexRow>
      {subtext ? (
        <Text color='dark50' small thin>
          {subtext}
        </Text>
      ) : null}
    </FlexCol>
  )
}
