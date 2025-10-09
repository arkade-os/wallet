import Text from './Text'
import { IonToggle } from '@ionic/react'
import FlexRow from './FlexRow'
import FlexCol from './FlexCol'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  text: string
  subtext?: string
}

export default function Toggle({ checked, onClick, text, subtext }: ToggleProps) {
  return (
    <FlexCol border gap='0' padding='0 0 1rem 0'>
      <FlexRow between onClick={onClick}>
        <Text thin>{text}</Text>
        <IonToggle checked={checked} />
      </FlexRow>
      {subtext ? (
        <Text color='dark50' small thin>
          {subtext}
        </Text>
      ) : null}
    </FlexCol>
  )
}
