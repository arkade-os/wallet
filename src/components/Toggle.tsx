import Text, { TextLabel } from './Text'
import { IonToggle } from '@ionic/react'
import FlexRow from './FlexRow'
import Padded from './Padded'
import Shadow from './Shadow'
import FlexCol from './FlexCol'

interface ToggleProps {
  checked: boolean
  label: string
  onClick: () => void
  text: string
}

export default function Toggle({ checked, label, onClick, text }: ToggleProps) {
  return (
    <FlexCol gap='0'>
      <TextLabel>{label}</TextLabel>
      <Shadow squared>
        <Padded>
          <FlexRow between onClick={onClick}>
            <Text>{text}</Text>
            <IonToggle checked={checked} />
          </FlexRow>
        </Padded>
      </Shadow>
    </FlexCol>
  )
}
