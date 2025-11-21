import { IonInput, IonText } from '@ionic/react'
import InputContainer from './InputContainer'
import ScanIcon from '../icons/Scan'
import Clipboard from './Clipboard'
import FlexCol from './FlexCol'
import { useRef, useEffect } from 'react'

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
  const firstRun = useRef(true)
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && firstRun.current) {
      firstRun.current = false
      input.current?.setFocus()
    }
  })

  const handleInput = (ev: Event) => {
    onChange((ev.target as HTMLInputElement).value)
  }

  return (
    <FlexCol gap='0.5rem'>
      <InputContainer label={label} error={error}>
        <IonInput
          name={name}
          onIonInput={handleInput}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
          placeholder={placeholder}
          ref={input}
          value={value}
        >
          <IonText slot='end' style={{ color: 'var(--dark80)', cursor: 'pointer' }}>
            <div onClick={openScan}>
              <ScanIcon />
            </div>
          </IonText>
        </IonInput>
      </InputContainer>
      <Clipboard onPaste={onChange} validator={validator} />
    </FlexCol>
  )
}
