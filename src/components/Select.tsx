import { IonSelect, IonSelectOption } from '@ionic/react'
import ChevronDownIcon from '../icons/ChevronDown'
import Text from './Text'

interface SelectProps {
  disabled?: boolean
  onSelect: (value: any) => void
  options: string[]
  selected: string
  title?: string
}

export default function Select({ disabled, onSelect, options, selected, title }: SelectProps) {
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
          top: title ? '3rem' : '0.75rem',
          zIndex: 100,
        }}
      >
        <ChevronDownIcon />
      </div>
      <IonSelect
        disabled={disabled}
        fill='solid'
        interface='popover'
        onIonChange={onChange}
        onIonFocus={console.log}
        onIonBlur={console.log}
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
