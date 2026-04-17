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
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus])

  const handleInput = (ev: React.FormEvent<HTMLInputElement>) => {
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
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          ref={input}
          name={name}
          value={value}
          onInput={handleInput}
          placeholder={placeholder}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            outline: 'none',
            padding: '0.5rem 0',
            width: '100%',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {hasValue ? (
            <ClearButtonOnInput onClick={handleClear} />
          ) : (
            <>
              <Paste validator={validator} onPaste={handlePaste} />
              <ScanButtonOnInput onClick={handleScan} />
            </>
          )}
        </div>
      </div>
    </InputContainer>
  )
}
