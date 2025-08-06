import { IonCheckbox } from '@ionic/react'
import FlexRow from './FlexRow'

interface CheckboxProps {
  onChange: () => void
  text: string
}

export default function Checkbox({ onChange, text }: CheckboxProps) {
  const style = {
    border: '1px solid var(--dark50)',
    borderRadius: '0.5rem',
    margin: '0 2px',
    padding: '0.5rem',
    width: '100%',
  }
  return (
    <div style={style}>
      <FlexRow>
        <IonCheckbox labelPlacement='end' onIonChange={onChange}>
          {text}
        </IonCheckbox>
      </FlexRow>
    </div>
  )
}
