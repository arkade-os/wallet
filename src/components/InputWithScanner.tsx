import InputContainer from './InputContainer'
import { useRef, useEffect, ChangeEventHandler } from 'react'
import { hapticLight } from '../lib/haptics'
import { getDeviceRuntime } from '../lib/device'
import { consoleError } from '../lib/logs'
import Paste from './Paste'
import { ClearButtonOnInput, ScanButtonOnInput } from './Button'
import FlexRow from './FlexRow'

interface InputWithScannerProps {
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
    onChange(data)
  }

  const handleClear = () => {
    hapticLight()
    onChange('')
  }

  /**
   * On native the system barcode scanner replaces the in-page `Scanner`
   * component, so `openScan()` (which swaps the parent screen for `Scanner`)
   * is never called and the parent's scan state simply stays false. The
   * adapter's `scanQrCode` is optional and only defined on native, so its
   * presence is the capability check — no runtime context needed here.
   */
  const handleScan = () => {
    hapticLight()
    const scanQrCode = getDeviceRuntime().scanQrCode
    if (!scanQrCode) return openScan()
    scanQrCode()
      .then((data) => {
        if (data) onChange(data)
      })
      .catch((err) => consoleError(err, 'error scanning QR code'))
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
