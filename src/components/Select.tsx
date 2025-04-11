import { IonSelect, IonSelectOption } from '@ionic/react'
import ChevronDownIcon from '../icons/ChevronDown'
import Text from './Text'

interface SelectProps {
  disabled?: boolean
  header?: string
  onSelect: (value: any) => void
  options: string[]
  selected: string
  subHeader?: string
  title?: string
}

export default function Select({ disabled, header, onSelect, options, selected, subHeader, title }: SelectProps) {
  const onChange = (e: CustomEvent) => onSelect(e.detail.value)

  const Label = ({ text }: { text: string }) => (
    <div style={{ padding: '0.5rem 1rem' }}>
      <Text capitalize color='dark50' smaller>
        {text}
      </Text>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {title ? <Label text={title} /> : null}
      <div
        style={{
          position: 'absolute',
          right: '0.5rem',
          top: title ? '3rem' : '.75rem',
          zIndex: 100,
        }}
      >
        <ChevronDownIcon />
      </div>
      <IonSelect
        disabled={disabled}
        interface='action-sheet'
        interfaceOptions={{ header, subHeader }}
        onIonChange={onChange}
        placeholder={options[0]}
        toggleIcon=''
        value={selected}
      >
        {options.map((option) => (
          <IonSelectOption key={option} value={option}>
            {option}
          </IonSelectOption>
        ))}
      </IonSelect>
    </div>
  )
}
