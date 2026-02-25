import Text from './Text'
import { IonToggle } from '@ionic/react'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import Focusable from './Focusable'
import { hapticLight } from '../lib/haptics'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  text: string
  subtext?: string
  testId?: string
}

export default function Toggle({ checked, onClick, text, subtext, testId }: ToggleProps) {
  const handleClick = () => {
    hapticLight()
    onClick()
  }

  return (
    <FlexCol border gap='0' padding='0 0 1rem 0'>
      <FlexRow between onClick={handleClick}>
        <Text thin>{text}</Text>
        <Focusable onEnter={handleClick} fit round>
          <IonToggle checked={checked} data-testid={testId} />
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
