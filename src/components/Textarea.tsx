import { ReactNode } from 'react'
import Text from './Text'
import { IonTextarea } from '@ionic/react'
import Shadow from './Shadow'
import FlexCol from './FlexCol'

interface TextareaProps {
  children?: ReactNode
  label?: string
  onChange?: (arg0: any) => void
  value?: string
}

export default function Textarea({ children, label, onChange, value }: TextareaProps) {
  const style = {
    padding: '0.5rem 1rem',
  }

  const handleChange = (ev: Event) => {
    const value = (ev.target as HTMLTextAreaElement).value
    if (onChange) onChange(value)
  }

  return (
    <FlexCol gap='0.5rem'>
      {label ? (
        <Text color='dark50' small>
          {label}
        </Text>
      ) : null}
      <Shadow>
        <IonTextarea onIonInput={handleChange} readonly={typeof onChange === 'undefined'} style={style} value={value}>
          {children}
        </IonTextarea>
      </Shadow>
    </FlexCol>
  )
}
