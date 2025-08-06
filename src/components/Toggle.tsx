import Text from './Text'
import { IonToggle } from '@ionic/react'
import FlexRow from './FlexRow'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  text: string
}

export default function Toggle({ checked, onClick, text }: ToggleProps) {
  return (
    <FlexRow between border onClick={onClick} padding='0.5rem 0'>
      <Text thin>{text}</Text>
      <IonToggle checked={checked} />
    </FlexRow>
  )
}
