import InputContainer from './InputContainer'
import { useRef, useEffect, ChangeEventHandler } from 'react'
import { hapticLight } from '../lib/haptics'
import Paste from './Paste'
import { ClearButtonOnInput, ScanButtonOnInput } from './Button'
import FlexRow from './FlexRow'

interface InputWithScannerProps {
  error?: string
  focus?: boolean
  label?: string
  name?: string
  onBlur?: () => void
  onChange: (arg0: any) => void
  onEnter?: () => void
  onFocus?: () => void
  onPaste?: (data: string) => void
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
  onBlur,
  onChange,
  onEnter,
  onFocus,
  onPaste,
  openScan,
  placeholder,
  validator,
  value,
}: InputWithScannerProps) {
  const input = useRef<HTMLInputElement>(null)
  const nativePasteRef = useRef(false)

  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus, input.current])

  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    const wasPaste = nativePasteRef.current
    nativePasteRef.current = false
    if (wasPaste && onPaste) onPaste(ev.currentTarget.value)
    else onChange(ev.currentTarget.value)
  }

  const handleNativePaste = () => {
    nativePasteRef.current = true
    // the change event fires synchronously after the paste is applied;
    // if the value didn't change (no change event), don't leak the flag
    setTimeout(() => (nativePasteRef.current = false), 0)
  }

  const handlePaste = (data: string) => (onPaste ?? onChange)(data)

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
      <label className='label has-buttons'>
        <input
          ref={input}
          name={name}
          value={value}
          className='input'
          onBlur={onBlur}
          onChange={handleChange}
          onFocus={onFocus}
          onPaste={handleNativePaste}
          placeholder={placeholder}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        />
        <div>
          {hasValue ? (
            <ClearButtonOnInput onClick={handleClear} />
          ) : (
            <FlexRow gap='0.25rem'>
              <Paste validator={validator} onPaste={handlePaste} />
              <ScanButtonOnInput onClick={handleScan} />
            </FlexRow>
          )}
        </div>
      </label>
    </InputContainer>
  )
}
