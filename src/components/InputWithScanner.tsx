import { IonInput, IonText } from '@ionic/react'
import InputContainer from './InputContainer'
import { useRef, useEffect } from 'react'
import { hapticLight } from '../lib/haptics'
import Paste from './Paste'
import { ClearButtonOnInput, ScanButtonOnInput } from './Button'

interface InputWithScannerProps {
  error?: string
  focus?: boolean
  label?: string
  name?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  placeholder?: string
  validator?: (arg0: string) => boolean
  value?: string
}

export default function InputWithScanner({
  error,
  focus,
  label,
  name,
  onChange,
  onEnter,
  openScan,
  placeholder,
  validator,
  value,
}: InputWithScannerProps) {
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && input.current) input.current.setFocus()
  }, [focus, input.current])

  const handleInput = (ev: Event) => {
    onChange((ev.target as HTMLInputElement).value)
  }

  const handlePaste = (data: string) => {
    onChange(data)
  }

  const handleClear = () => {
    hapticLight()
    onChange('')
  }

  const handleScan = () => {
    hapticLight()
    openScan()
  }

  const hasValue = Boolean(value && value.length > 0)

  return (
    <InputContainer label={label} error={error}>
      <IonInput
        ref={input}
        name={name}
        value={value}
        onIonInput={handleInput}
        placeholder={placeholder}
        onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
      >
        <IonText slot='end'>
          {hasValue ? (
            <ClearButtonOnInput onClick={handleClear} />
          ) : (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <Paste validator={validator} onPaste={handlePaste} />
              <ScanButtonOnInput onClick={handleScan} />
            </div>
          )}
        </IonText>
      </IonInput>
    </InputContainer>
  )
}
