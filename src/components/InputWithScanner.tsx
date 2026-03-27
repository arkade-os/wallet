import { IonInput, IonText } from '@ionic/react'
import InputContainer from './InputContainer'
import PasteIcon from '../icons/Paste'
import ScanIcon from '../icons/Scan'
import XIcon from '../icons/X'
import { useRef, useEffect } from 'react'
import { pasteFromClipboard } from '../lib/clipboard'
import { hapticLight } from '../lib/haptics'

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

const pillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.4rem 0.65rem',
  borderRadius: '999px',
  border: '1px solid var(--dark20)',
  background: 'var(--dark05)',
  cursor: 'pointer',
  fontSize: '13px',
  color: 'var(--dark80)',
  whiteSpace: 'nowrap',
  minHeight: '36px',
  position: 'relative',
  touchAction: 'manipulation',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
}

// Expands tap target to 44px without increasing visual size
const hitAreaStyle: React.CSSProperties = {
  content: '""',
  position: 'absolute',
  inset: '-4px',
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
  value,
}: InputWithScannerProps) {
  const input = useRef<HTMLIonInputElement>(null)

  useEffect(() => {
    if (focus && input.current) input.current.setFocus()
  }, [focus, input.current])

  const handleInput = (ev: Event) => {
    onChange((ev.target as HTMLInputElement).value)
  }

  const handlePaste = () => {
    hapticLight()
    pasteFromClipboard().then((data) => {
      if (data) onChange(data)
    })
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
            <button
              type='button'
              onClick={handleClear}
              aria-label='Clear address'
              style={{
                ...pillBase,
                padding: '0.4rem 0.5rem',
                background: 'none',
                border: 'none',
                color: 'var(--dark50)',
              }}
            >
              <span style={hitAreaStyle} />
              <XIcon />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button type='button' onClick={handlePaste} aria-label='Paste address' style={pillBase}>
                <span style={hitAreaStyle} />
                <PasteIcon />
                Paste
              </button>
              <button type='button' onClick={handleScan} aria-label='Scan QR code' style={pillBase}>
                <span style={hitAreaStyle} />
                <ScanIcon />
                Scan QR
              </button>
            </div>
          )}
        </IonText>
      </IonInput>
    </InputContainer>
  )
}
