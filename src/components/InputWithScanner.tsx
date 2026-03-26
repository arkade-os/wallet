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
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus])

  const handleInput = (ev: React.FormEvent<HTMLInputElement>) => {
    onChange((ev.target as HTMLInputElement).value)
  }

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    outline: 'none',
    padding: '0.5rem 0',
    width: '100%',
  }

  return (
    <FlexCol gap='0.5rem'>
      <InputContainer label={label} error={error}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <input
            ref={input}
            name={name}
            value={value}
            onInput={handleInput}
            placeholder={placeholder}
            onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
            style={inputStyle}
          />
          <button
            type='button'
            onClick={openScan}
            aria-label='Scan code'
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--dark80)',
              cursor: 'pointer',
              flexShrink: 0,
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <ScanIcon />
          </button>
        </div>
      </InputContainer>
      <Clipboard onPaste={onChange} validator={validator} />
    </FlexCol>
  )
}
