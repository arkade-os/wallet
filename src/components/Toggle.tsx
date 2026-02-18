import Text from './Text'
import { IonToggle } from '@ionic/react'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'
import Focusable from './Focusable'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, onClick, subtext, text, testId }: ToggleProps) {
  return (
    <FlexCol gap='0' padding='0 0 1rem 0'>
      <FlexRow between onClick={onClick}>
        <Text thin>{text}</Text>
        <Focusable onEnter={onClick} fit round>
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
