import InputContainer from './InputContainer'
import { useRef, useEffect, ChangeEventHandler } from 'react'
import { hapticLight } from '../lib/haptics'
import Paste from './Paste'
import { ClearButtonOnInput, ScanButtonOnInput } from './Button'
import FlexRow from './FlexRow'

interface InputWithScannerProps {
  disabled?: boolean
  error?: string
  focus?: boolean
  label?: string
  name?: string
  onChange: (arg0: any) => void
  onEnter?: () => void
  openScan: () => void
  placeholder?: string
  value?: string
}

export default function InputWithScanner({
  disabled,
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
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focus && input.current) input.current.focus()
  }, [focus, input.current])

  const handleChange: ChangeEventHandler<HTMLInputElement> = (ev) => {
    onChange(ev.currentTarget.value)
  }

  const handlePaste = (data: string) => {
    if (disabled) return
    onChange(data)
  }

  const handleClear = () => {
    if (disabled) return
    hapticLight()
    onChange('')
  }

  const handleScan = () => {
    if (disabled) return
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
          disabled={disabled}
          className='input'
          onChange={handleChange}
          placeholder={placeholder}
          onKeyUp={(ev) => ev.key === 'Enter' && onEnter && onEnter()}
        />
        <div>
          {hasValue ? (
            <ClearButtonOnInput onClick={handleClear} />
          ) : (
            <FlexRow gap='0.25rem'>
              <Paste onPaste={handlePaste} />
              <ScanButtonOnInput onClick={handleScan} />
            </FlexRow>
          )}
        </div>
      </label>
    </InputContainer>
  )
}
